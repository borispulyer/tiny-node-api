/*
 * Imports
 */
import 'dotenv/config'
import http from 'node:http'
import fs from 'node:fs/promises'
import * as modules from './modules'
import * as errors from '@/errors'
import { config, url, logger } from '@/core'

/**
 * Initialize HTTP server
 */
export const server = http
	.createServer(async (request, response) => {
		logger.http(request, response)
		try {
			const t0 = performance.now()

			// Validate Method
			if (request.method !== 'GET')
				throw new errors.HttpError('Method not allowed', 405, { Allow: 'GET' })

			// Get requested pathname
			const pathname = url.getPathname(request.url)

			// Handle locations before authentication
			const location_preAuth = await modules.heartbeat(pathname)
			if (location_preAuth) {
				await createResponse(location_preAuth, { request, response })
				return
			}

			// Handle Authentication
			await modules.auth(request)

			// Handle locations after authentication
			const location_postAuth =
				(await modules.endpoints(pathname)) ?? (await modules.filesystem(pathname))
			if (location_postAuth) {
				await createResponse(location_postAuth, { request, response })
				return
			}

			// No location matched
			throw new errors.HttpError('Not found', 404)
		} catch (error: any) {
			if (error instanceof errors.ConfigurationError) {
				logger.error({ module: 'server', error })
				response.writeHead(500).end(`Error 500 - Internal server error.`)
				return
			}
			if (error instanceof errors.HttpError) {
				logger.debug({ module: 'server', error })
				const status_code = error.status ?? 500
				response
					.writeHead(status_code, error.headers)
					.end(`Error ${status_code} - ${error.message}.`)
				return
			}
			logger.debug({ module: 'server', error })
			throw error
		}
	})
	.on('connection', (socket) => {
		socket.setTimeout(config.server.timeouts.socket)
		socket.on('timeout', () => {
			logger.debug(
				{ module: 'server', socket },
				`Socket timeout after idle (${config.server.timeouts.socket} ms)`,
			)
			socket.destroy()
		})
	})

/**
 * Configure HTTP server
 */
server.keepAliveTimeout = config.server.timeouts.keepAlive
server.headersTimeout = config.server.timeouts.headers
server.requestTimeout = config.server.timeouts.request
server.maxRequestsPerSocket = config.server.maxRequestsPerSocket

async function createResponse(
	payload: { content: any; mime: string; file?: string } | undefined,
	server: { request: http.IncomingMessage; response: http.ServerResponse },
): Promise<http.ServerResponse> {
	if (!payload) return server.response
	const { content, mime = 'text/plain', file } = payload
	const { request, response } = server

	const headers: Record<string, string> = {
		'Content-Type': `${mime}`,
		'X-Content-Type-Options': 'nosniff',
		'Cache-Control': 'stale-while-revalidate=300, stale-if-error=3600',
		Vary: 'Accept-Encoding',
	}

	if (file) {
		const fsStats = await fs.stat(file).catch(() => null)
		if (fsStats?.isFile()) {
			headers['ETag'] = `W/"${Math.trunc(fsStats.mtimeMs)}-${fsStats.size}"`
			headers['Last-Modified'] = new Date(fsStats.mtimeMs).toUTCString()

			if (request.headers['if-none-match'] === headers['ETag']) {
				return response.writeHead(304, headers).end()
			}

			const ims = request.headers['if-modified-since']
			if (ims && new Date(ims).getTime() >= fsStats.mtimeMs) {
				return response.writeHead(304, headers).end()
			}
		}
	}

	return response.writeHead(200, headers).end(content)
}
