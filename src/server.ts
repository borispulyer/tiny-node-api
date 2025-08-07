/*
 * Imports
 */

// Dependencies
import http from 'node:http'
import path from 'node:path'
import { URL } from 'node:url'

// Internal Modules
import * as Parser from '@/parser'
import * as Modifier from '@/modifier'
import * as Formatter from '@/formatter'
import { logger } from './core'

/*
 * Const
 */
const DIR_APP: string = path.resolve(import.meta.dirname, '..')
const DIR_PUBLIC: string = path.resolve(DIR_APP, process.env.DIR_PUBLIC ?? 'public')
const SERVER_PORT: string | number = process.env.PORT || 3000
const INC_FLAG = (process.env.RESOLVE_INCLUDE ?? 'true').toLowerCase() !== 'false'
const DEFAULT_STYLE: string = (process.env.DEFAULT_STYLE ?? 'json').toLowerCase()

/*
 * Error Definitions
 */
class HttpError extends Error {
	public statusCode: number | undefined = undefined

	public constructor(message: string, statusCode: number) {
		super(message)
		this.name = this.constructor.name
		this.statusCode = statusCode
	}
}

/**
 * Initialize HTTP server
 */
const server = http.createServer(async (request, response) => {
	try {
		const t0 = performance.now()

		// Validate Method
		if (request.method !== 'GET') throw new HttpError('Method not allowed', 405)

		// Get filename and parameters
		const { pathname, searchParams } = new URL(
			request.url!,
			`http://${request.headers.host || 'dummy'}`,
		)

		// Validate filename
		const file = path.resolve(
			DIR_PUBLIC,
			path.posix.normalize(decodeURIComponent(pathname)).replace(/^\/+/, ''),
		)
		if (!file.startsWith(DIR_PUBLIC)) throw new HttpError('Forbidden', 403)

		// Validate style paramter
		const style = (searchParams.get('style') ?? DEFAULT_STYLE).toLowerCase().trim()
		if (!Formatter.isFormatterRegistered(style))
			throw new HttpError(`Style paramter "${style}" not valid`, 400)

		let data = null

		// Parser
		try {
			data = await Parser.parse(file)
		} catch (error: any) {
			if (error instanceof Parser.ParserMissingError) {
				throw new HttpError(error.message, 404)
			}
			if (error instanceof Parser.ParserFilereadError) {
				throw new HttpError(error.message, 404)
			}
			if (error instanceof Parser.ParserSyntaxError) {
				throw new HttpError(error.message, 500)
			}
			throw error
		}
		// logger.debug(`[Data:]`, data)

		// Modifier
		let modifiers = ['include']
		try {
			data = await Modifier.modify(data, modifiers, path.dirname(file))
		} catch (error: any) {
			if (error instanceof Modifier.ModifierSyntaxError) {
				throw new HttpError(error.message, 500)
			}
			throw error
		}
		// logger.debug(`[Data:]`, data)

		// Formatter
		try {
			data = await Formatter.format(data, style)
		} catch (error: any) {
			if (error instanceof Formatter.FormatterMissingError) {
				throw new HttpError(error.message, 500)
			}
			throw error
		}
		// logger.debug(`[Data:]`, data)

		const t1 = performance.now()
		// Send
		logger.info(`GET "${file}" as ${style}\t${(t1 - t0).toFixed(2)} ms`)
		response.writeHead(200, { 'Content-Type': data.mime }).end(data.content)
	} catch (error: any) {
		if (error instanceof HttpError) {
			const status_code = error.statusCode ?? 500
			response.writeHead(status_code).end(`Error ${status_code} - ${error.message}`)
			return
		}
		throw error
	}
})

/**
 * Start HTTP server
 */
server.listen(SERVER_PORT, () => {
	logger.info(`Server started at http://localhost:${SERVER_PORT}`)
})
