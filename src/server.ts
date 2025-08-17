/*
 * Imports
 */

// Development Dependencies
import 'dotenv/config'

// Dependencies
import http from 'node:http'
import fs from 'node:fs/promises'
import { JWTPayload } from 'jose'

// Internal Modules
import { config } from '@config'
import * as Auth from '@/auth'
import * as locations from '@/locations'
import * as errors from '@/errors'
import { url } from '@utils'
import { logger } from '@/core'

/**
 * Initialize HTTP server
 */
const server = http.createServer(async (request, response) => {
	try {
		const t0 = performance.now()

		// Validate Method
		if (request.method !== 'GET')
			throw new errors.HttpError('Method not allowed', 405, { Allow: 'GET' })

		const pathname = url.getPathname(request.url)

		// Handle locations before authentication
		const location_preAuth = await locations.heartbeat(pathname)
		if (location_preAuth) {
			await createResponse(location_preAuth, { request, response })
			return
		}

		// Handle Authentication
		await handleAuthentication(request)

		// Handle locations after authentication
		const location_postAuth =
			(await locations.endpoints(pathname)) ?? (await locations.filesystem(pathname))
		if (location_postAuth) {
			await createResponse(location_postAuth, { request, response })
			return
		}

		// No location matched
		throw new errors.HttpError('Not found', 404)
	} catch (error: any) {
		logger.error(error)
		if (error instanceof errors.HttpError) {
			const status_code = error.status ?? 500
			response
				.writeHead(status_code, error.headers)
				.end(`Error ${status_code} - ${error.message}`)
			return
		}
		throw error
	}
})

/**
 * Configure HTTP server
 */
server.keepAliveTimeout = config.server.timeouts.keepAlive
server.headersTimeout = config.server.timeouts.headers
server.requestTimeout = config.server.timeouts.request
server.maxRequestsPerSocket = config.server.maxRequestsPerSocket

server.on('connection', (socket) => {
	socket.on('timeout', () => logger.warn('socket timeout (idle)'))
})
server.on('request', (req, res) => {
	req.on('aborted', () => logger.warn('request aborted by client'))
})

/**
 * Start HTTP server
 */
server.listen(config.server.port, () => {
	logger.info(`Server started at http://localhost:${config.server.port}`)
	logger.info('Config: ', config)
})

async function handleAuthentication(
	request: http.IncomingMessage,
): Promise<JWTPayload | undefined> {
	if (config.auth.enable) {
		try {
			const token = await Auth.auth(request)
			return token
		} catch (error: any) {
			if (error instanceof Auth.AuthError) {
				throw new errors.HttpError(
					`[${error.name}] ${error.message}`,
					error.header.status,
					{
						'WWW-Authenticate': error.getWWWAuthenticateHeader(),
					},
				)
			}
			throw error
		}
	}
	return undefined
}

async function createResponse(
	payload: { content: any; mime: string; file?: string } | undefined,
	server: { request: http.IncomingMessage; response: http.ServerResponse },
): Promise<http.ServerResponse> {
	if (!payload) return server.response
	const { content, mime = 'text/plain', file } = payload
	const { request, response } = server

	const headers: Record<string, string> = {
		'Content-Type': `${mime}; charset=utf-8`,
		'X-Content-Type-Options': 'nosniff',
		'Cache-Control': 'no-cache',
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
