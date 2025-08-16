/*
 * Imports
 */

// Development Dependencies
import 'dotenv/config'

// Dependencies
import http from 'node:http'
import path from 'node:path'
import fs from 'node:fs/promises'
import { URL } from 'node:url'
import { JWTPayload } from 'jose'

// Internal Modules
import * as Auth from '@/auth'
import * as Parser from '@/parser'
import * as Modifier from '@/modifier'
import * as Formatter from '@/formatter'
import * as locations from '@/locations'
import * as errors from '@/errors'
import { config } from '@config'
import { logger } from '@/core'

/**
 * Initialize HTTP server
 */
const server = http
	.createServer(async (request, response) => {
		try {
			const t0 = performance.now()

			// Validate Method
			if (request.method !== 'GET') throw new errors.HttpError('Method not allowed', 405)

			// Get filename
			const { pathname: encoded_pathname } = new URL(
				request.url!,
				`http://${request.headers.host || 'dummy'}`,
			)
			const pathname = decodeURIComponent(encoded_pathname)

			// Location: Heartbeat
			if (await locations.heartbeat(pathname, { request, response, t0 })) return

			// Handle Authentication
			await handleAuthentication(request)

			// Location: Endpoints
			if (await locations.endpoints(pathname, { request, response, t0 })) return

			// Location: Files
			if (await locations.files(pathname, { request, response, t0 })) return

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
	.listen(config.server.port, () => {
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
