/*
 * Imports
 */
import http from 'node:http'
import { JWTPayload } from 'jose'
import * as Modules from './modules'
import * as Errors from './server.errors'
import type * as Types from './server.types'
import { url } from '@/core'

export class Server {
	private _ctx
	private _server
	private _errors

	get ['errors']() {
		return this._errors
	}

	private constructor(ctx: Types.ConstructorCtx, setup: Types.ConstructorSetup) {
		this._ctx = ctx
		this._server = this._createServer()
		this._errors = Errors
	}

	public static async init(ctx: Types.InitCtx): Promise<Server> {
		Modules.endpoints.createIndex(ctx.config.endpoints)
		return new Server(
			{
				config: structuredClone({
					server: ctx.config.server,
					filesystem: ctx.config.filesystem,
					endpoints: ctx.config.endpoints,
					auth: ctx.config.auth,
					parser: ctx.config.parser,
					modifier: ctx.config.modifier,
					formatter: ctx.config.formatter,
				}),
				logger: ctx.logger,
				parser: ctx.parser,
				modifier: ctx.modifier,
				formatter: ctx.formatter,
				auth: ctx.auth,
			},
			{},
		)
	}

	public start(): void {
		this._server.listen(this._ctx.config.server.port, () => {
			this._ctx.logger.info(
				{ module: 'server' },
				`Server started at http://localhost:${this._ctx.config.server.port}`,
			)
			this._ctx.logger.trace({ module: 'server', config: this._ctx.config }, `Configuration`)
		})
	}

	/**
	 * Create and configure HTTP server
	 */
	private _createServer(): http.Server {
		const server = http
			// Create server to handle incoming HTTP requests.
			.createServer(async (request, response) => {
				this._ctx.logger.http(request, response)
				try {
					// Validate Method
					if (request.method !== 'GET')
						throw new Errors.HttpError('Method not allowed', 405, { Allow: 'GET' })

					// Get requested pathname
					const pathname = url.getPathname(request.url)
					if (!pathname) throw new Errors.HttpError('Bad request', 400)

					// Handle locations before authentication
					const location_preAuth = await Modules.heartbeat.run(pathname, this._ctx)
					if (location_preAuth) {
						await this._createResponse(location_preAuth, { request, response })
						return
					}

					// Handle Authentication
					const auth = await Modules.auth.run(request, this._ctx)

					// Handle locations after authentication
					const location_postAuth =
						(await Modules.endpoints.run(pathname, request, this._ctx)) ??
						(await Modules.filesystem.run(pathname, request, this._ctx))
					if (location_postAuth) {
						await this._createResponse(location_postAuth, { request, response, auth })
						return
					}

					// No location matched
					throw new Errors.HttpError('Not found', 404)
				} catch (error: any) {
					if (error instanceof Errors.ConfigurationError) {
						this._ctx.logger.error({ module: 'server', error })
						response.writeHead(500).end('Error 500 - Internal server error.')
						return
					}
					if (error instanceof Errors.HttpNotModifiedError) {
						this._ctx.logger.debug({ module: 'server', error })
						response.writeHead(304, error.headers).end()
						return
					}
					if (error instanceof Errors.HttpError) {
						this._ctx.logger.debug({ module: 'server', error })
						const status_code = error.status ?? 500
						response
							.writeHead(status_code, error.headers)
							.end(`Error ${status_code} - ${error.message}.`)
						return
					}
					this._ctx.logger.debug({ module: 'server', error })
					throw error
				}
			})
			// Socket timeouts.
			.on('connection', (socket) => {
				socket.setTimeout(this._ctx.config.server.timeouts.socket)
				socket.on('timeout', () => {
					this._ctx.logger.debug(
						{ module: 'server', socket },
						`Socket timeout after idle (${this._ctx.config.server.timeouts.socket} ms)`,
					)
					socket.destroy()
				})
			})

		// Other timeouts
		server.keepAliveTimeout = this._ctx.config.server.timeouts.keepAlive
		server.headersTimeout = this._ctx.config.server.timeouts.headers
		server.requestTimeout = this._ctx.config.server.timeouts.request
		server.maxRequestsPerSocket = this._ctx.config.server.maxRequestsPerSocket

		// Return Server
		return server
	}

	/**
	 * Create and send an HTTP response based on payload data.
	 * @param payload - Object containing response content and metadata.
	 * @param server - Request and response objects of the current connection.
	 * @returns The response object.
	 */
	private async _createResponse(
		payload: { content: any; mime: string; etag?: string; last_modified?: string } | undefined,
		server: { request: http.IncomingMessage; response: http.ServerResponse; auth?: JWTPayload },
	): Promise<http.ServerResponse> {
		if (!payload) return server.response
		const { content, mime = 'text/plain', etag, last_modified } = payload
		const { request, response, auth } = server

		const headers: http.OutgoingHttpHeaders = {
			'Content-Type': `${mime}`,
			'Cache-Control': auth
				? this._ctx.config.server.cache.cacheControlHeaderAuth
				: this._ctx.config.server.cache.cacheControlHeader,
			'X-Content-Type-Options': 'nosniff',
			Vary: auth ? 'Accept-Encoding, Authorization' : 'Accept-Encoding',
		}
		if (etag) headers['ETag'] = etag
		if (last_modified) headers['Last-Modified'] = last_modified

		return response.writeHead(200, headers).end(content)
	}
}
