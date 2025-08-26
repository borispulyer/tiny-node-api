/*
 * Imports
 */
import http from 'node:http'
import fs from 'node:fs/promises'
import { JWTPayload } from 'jose'
import * as modules from './modules'
import * as errors from './errors'
import { config, url, logger } from '@/core'

/**
 * Initialize HTTP server
 */
export const server = http
	/**
	 * Handle incoming HTTP requests.
	 * @param request - Incoming HTTP request.
	 * @param response - Server response object.
	 * @returns Promise resolving when the request has been handled.
	 */
	.createServer(async (request, response) => {
		logger.http(request, response)
		try {
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
			const auth = await modules.auth(request)

			// Handle locations after authentication
			const location_postAuth =
				(await modules.endpoints(pathname, request)) ??
				(await modules.filesystem(pathname, request))
			if (location_postAuth) {
				await createResponse(location_postAuth, { request, response, auth })
				return
			}

			// No location matched
			throw new errors.HttpError('Not found', 404)
		} catch (error: any) {
			if (error instanceof errors.ConfigurationError) {
				logger.error({ module: 'server', error })
				response.writeHead(500).end('Error 500 - Internal server error.')
				return
			}
			if (error instanceof errors.HttpNotModifiedError) {
				logger.debug({ module: 'server', error })
				response.writeHead(304, error.headers).end()
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
	/**
	 * Configure new connections and enforce socket timeouts.
	 * @param socket - Connected socket.
	 * @returns Void.
	 */
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

/**
 * Create and send an HTTP response based on payload data.
 * @param payload - Object containing response content and metadata.
 * @param server - Request and response objects of the current connection.
 * @returns The response object.
 */
async function createResponse(
	payload: { content: any; mime: string; etag?: string; last_modified?: string } | undefined,
	server: { request: http.IncomingMessage; response: http.ServerResponse; auth?: JWTPayload },
): Promise<http.ServerResponse> {
	if (!payload) return server.response
	const { content, mime = 'text/plain', etag, last_modified } = payload
	const { request, response, auth } = server

	const headers: http.OutgoingHttpHeaders = {
		'Content-Type': `${mime}`,
		'Cache-Control': auth
			? config.server.cache.cacheControlHeaderAuth
			: config.server.cache.cacheControlHeader,
		'X-Content-Type-Options': 'nosniff',
		Vary: 'Accept-Encoding',
	}
	if (etag) headers['ETag'] = etag
	if (last_modified) headers['Last-Modified'] = last_modified

	return response.writeHead(200, headers).end(content)
}
