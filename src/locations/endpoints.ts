/*
 * Imports
 */
import http from 'node:http'
import path from 'node:path'
import * as Parser from '@/parser'
import * as Modifier from '@/modifier'
import * as Formatter from '@/formatter'
import * as errors from '@/errors'
import { config } from '@config'
import { logger } from '@/core'

const _enpointsIndex = (() => {
	const endpoints = []
	logger.debug(`Registering ENDPOINTS:`)

	for (const endpoint of config.endpoints) {
		// Skip disabled endpoints
		if (!endpoint.enable) continue

		if (!endpoint.path.includes('{')) {
			// Path contains no paramters -> 'static'
			endpoints.push({
				path: endpoint.path,
				file: endpoint.file,
				format: endpoint.format,
				filter: endpoint.filter,
			})
		} else {
			// Path contains {paramters} -> regex
			const params: string[] = []
			const escaped = endpoint.path
				.replace(/[-/\\^$*+?.()|[\]{}]/g, (char) =>
					char === '{' || char === '}' ? char : '\\' + char,
				)
				.replace(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g, (char, param) => {
					params.push(param)
					return `(?<${param}>[^/]+)`
				})
			endpoints.push({
				path: endpoint.path,
				file: endpoint.file,
				format: endpoint.format,
				filter: endpoint.filter,
				regex: new RegExp(`^${escaped}/?$`),
				params: params,
			})
		}
		logger.debug(`  - "${endpoint.path}"`)
	}
	if (endpoints.length == 0) logger.debug(`  <none>`)
	return endpoints
})()

export async function endpoints(
	pathname: string,
	server: { request?: http.IncomingMessage; response: http.ServerResponse; t0?: number },
): Promise<boolean> {
	// Check Responsibility
	const requested_endpoint = matchEndpoint(pathname)
	if (!requested_endpoint) return false

	const { endpoint, params } = requested_endpoint

	// Get style of output format
	const style = endpoint.format ?? path.extname(endpoint.file).toLowerCase().replace(/^\./, '')

	const file = path.resolve(config.server.root, endpoint.file)
	logger.debug('Files', file, endpoint.file, config.server.root)

	// Parser
	let data: any
	try {
		data = await Parser.parse(file)
	} catch (error: any) {
		if (error instanceof Parser.ParserMissingError) {
			throw new errors.HttpError(`[${error.name}] ${error.message}`, 404)
		}
		if (error instanceof Parser.ParserFilereadError) {
			throw new errors.HttpError(`[${error.name}] ${error.message}`, 404)
		}
		if (error instanceof Parser.ParserSyntaxError) {
			throw new errors.HttpError(`[${error.name}] ${error.message}`, 500)
		}
		throw error
	}

	// Modifier
	const modifiers = [config.modifier.modules.include && 'include'].filter((x): x is string =>
		Boolean(x),
	)
	try {
		data = await Modifier.modify(data, modifiers, path.dirname(file))
	} catch (error: any) {
		if (error instanceof Modifier.ModifierFilereadError) {
			throw new errors.HttpError(`[${error.name}] ${error.message}`, 404)
		}
		if (error instanceof Modifier.ModifierSyntaxError) {
			throw new errors.HttpError(`[${error.name}] ${error.message}`, 500)
		}
		throw error
	}

	// Filter
	if (typeof endpoint.filter === 'function') {
		try {
			data = await endpoint.filter(data, params)
		} catch (error: any) {
			throw new errors.HttpError(`Endpoint filter failed: ${error.message}`, 500)
		}
	}

	// Formatter
	try {
		data = await Formatter.format(data, style)
	} catch (error: any) {
		if (error instanceof Formatter.FormatterMissingError) {
			throw new errors.HttpError(`[${error.name}] ${error.message}`, 400)
		}
		throw error
	}

	const t1 = performance.now()

	// Send response
	server.response.writeHead(200, { 'Content-Type': data.mime }).end(data.content)
	logger.info(
		`GET [endpoint "${endpoint.path}"] -> source="${path.relative(config.server.root, file)}" as $${server.t0 ? (t1 - server.t0).toFixed(2) : '-'} ms`,
	)
	return true
}

function matchEndpoint(pathname: string) {
	for (const endpoint of _enpointsIndex) {
		if (endpoint.regex) {
			const matches = endpoint.regex.exec(pathname)
			if (matches) return { endpoint, params: matches.groups }
		} else {
			if (pathname.startsWith(endpoint.path)) return { endpoint }
		}
	}
	return null
}
