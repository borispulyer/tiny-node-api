/*
 * Imports
 */
import path from 'node:path'
import * as Parser from '@/parser'
import * as Modifier from '@/modifier'
import * as Formatter from '@/formatter'
import * as errors from '@/errors'
import { config } from '@config'
import { logger } from '@/core'

const _endpointsIndex = (() => {
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
): Promise<{ content: any; mime: string; file?: string } | undefined> {
	// Check Responsibility - Step 1
	// Check if filesystem is enabled in config
	if (!config.server.locations.endpoints) return undefined

	// Check Responsibility - Step 2
	// Check if pathname matches an endpoint
	const requested_endpoint = matchEndpoint(pathname)
	if (!requested_endpoint) return undefined

	const { endpoint, params } = requested_endpoint
	const file = path.resolve(config.server.root, endpoint.file)

	// Get style of output format
	let style = endpoint.format ?? path.extname(endpoint.file).toLowerCase().replace(/^\./, '')
	if (!Formatter.isFormatterRegistered(style)) {
		style = config.formatter.default
	}

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
		if (error instanceof Modifier.ModifierFileReadError) {
			throw new errors.HttpError(`[${error.name}] ${error.message}`, 404)
		}
		if (error instanceof Modifier.ModifierFileAccesError) {
			throw new errors.HttpError(`[${error.name}] ${error.message}`, 403)
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
			throw new errors.HttpError(`[${error.name}] ${error.message}`, 406)
		}
		throw error
	}

	// Send response
	return {
		content: data.content,
		mime: data.mime,
		file: file,
	}
}

function matchEndpoint(pathname: string) {
	for (const endpoint of _endpointsIndex) {
		if (endpoint.regex) {
			const matches = endpoint.regex.exec(pathname)
			if (matches) return { endpoint, params: matches.groups }
		} else {
			if (pathname.startsWith(endpoint.path)) return { endpoint }
		}
	}
	return null
}
