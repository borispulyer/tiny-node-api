/*
 * Imports
 */

// Development Dependencies
import 'dotenv/config'

// Dependencies
import http from 'node:http'
import path from 'node:path'
import { URL } from 'node:url'

// Internal Modules
import * as Auth from '@/auth'
import * as Parser from '@/parser'
import * as Modifier from '@/modifier'
import * as Formatter from '@/formatter'
import * as errors from './errors'
import { config } from '@config'
import { logger } from './core'
import { JWTPayload } from 'jose'

/**
 * Initialize HTTP server
 */
const server = http.createServer(async (request, response) => {
	try {
		const t0 = performance.now()

		// Validate Method
		if (request.method !== 'GET') throw new errors.HttpError('Method not allowed', 405)

		// Handle Authentication
		await handleAuthentication(request)

		// Get filename and parameters
		const { pathname, searchParams } = new URL(
			request.url!,
			`http://${request.headers.host || 'dummy'}`,
		)

		// Validate filename
		const file = path.resolve(
			config.server.root,
			path.posix.normalize(decodeURIComponent(pathname)).replace(/^\/+/, ''),
		)
		if (decodeURIComponent(pathname).startsWith('/_heartbeat')) {
			response.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' }).end('❤')
			return
		}
		if (!file.startsWith(config.server.root)) throw new errors.HttpError('Forbidden', 403)

		// Validate style parameter
		const style = (searchParams.get('style') ?? DEFAULT_STYLE).toLowerCase().trim()
		if (!Formatter.isFormatterRegistered(style))
			throw new errors.HttpError(`Style parameter "${style}" not valid`, 400)

		// Parser
		let data: any
		data = await handleParser(file)
		// Modifier
		data = await handleModifier(data, file)
		// Formatter
		data = await handleFormatter(data, style)

		const t1 = performance.now()

		// Send
		logger.info(`GET "${file}" as ${style}\t${(t1 - t0).toFixed(2)} ms`)
		response.writeHead(200, { 'Content-Type': data.mime }).end(data.content)
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
 * Start HTTP server
 */
server.listen(config.server.port, () => {
	logger.info(`Server started at http://localhost:${SERVER_PORT}`)
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

async function handleParser(file: string): Promise<any> {
	try {
		return await Parser.parse(file)
	} catch (error: any) {
		if (error instanceof Parser.ParserMissingError) {
			throw new errors.HttpError(error.message, 404)
		}
		if (error instanceof Parser.ParserFilereadError) {
			throw new errors.HttpError(error.message, 404)
		}
		if (error instanceof Parser.ParserSyntaxError) {
			throw new errors.HttpError(error.message, 500)
		}
		throw error
	}
	return undefined
}

async function handleModifier(data: any, file: string): Promise<any> {
	const modifiers = [config.modifier.modules.include && 'include'].filter((x): x is string =>
		Boolean(x),
	)
	try {
		return await Modifier.modify(data, modifiers, path.dirname(file))
	} catch (error: any) {
		if (error instanceof Modifier.ModifierFilereadError) {
			throw new errors.HttpError(error.message, 404)
		}
		if (error instanceof Modifier.ModifierSyntaxError) {
			throw new errors.HttpError(error.message, 500)
		}
		throw error
	}
	return undefined
}

async function handleFormatter(data: any, style: string): Promise<any> {
	try {
		return await Formatter.format(data, style)
	} catch (error: any) {
		if (error instanceof Formatter.FormatterMissingError) {
			throw new errors.HttpError(error.message, 500)
		}
		throw error
	}
	return undefined
}
