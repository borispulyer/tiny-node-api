/*
 * Imports
 */
import path from 'node:path'
import * as Parser from '@/parser'
import * as Modifier from '@/modifier'
import * as Formatter from '@/formatter'
import * as errors from '@/errors'
import { config, logger, imports } from '@/core'

const _indexEndpoints = (() => {
	const endpoints = []

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
	}
	return endpoints
})()

/**
 * Handle configured endpoint requests.
 * @param pathname - Requested URL pathname.
 * @returns Endpoint payload or undefined if not responsible.
 */
export async function endpoints(
	pathname: string,
): Promise<{ content: any; mime: string; file?: string } | undefined> {
	logger.trace(
		{ module: 'location/endpoints', pathname },
		`Checking responsibility for current request...`,
	)

	// Check Responsibility - Step 1
	// Check if filesystem is enabled in config
	if (!config.server.locations.endpoints) return undefined

	// Check Responsibility - Step 2
	// Check if pathname matches an endpoint
	const requested_endpoint = matchEndpoint(pathname)
	if (!requested_endpoint) return undefined

	logger.trace(
		{ module: 'location/endpoints', requested_endpoint },
		`Module is responsible for current request. Handling request...`,
	)

	const { endpoint, params } = requested_endpoint
	const file = path.resolve(config.server.path.public, endpoint.file)

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
		logger.debug({ module: 'location/endpoints', error })
		if (error instanceof Parser.ParserMissingError) {
			throw new errors.HttpError(`${error.message}`, 404)
		}
		if (error instanceof Parser.ParserFilereadError) {
			throw new errors.HttpError(`File not found`, 404)
		}
		if (error instanceof Parser.ParserSyntaxError) {
			throw new errors.HttpError(`Syntax error in file`, 500)
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
		logger.debug({ module: 'location/endpoints', error })
		if (error instanceof Modifier.ModifierMissingError) {
			throw new errors.HttpError(`${error.message}`, 500)
		}
		if (error instanceof Modifier.ModifierFileReadError) {
			throw new errors.HttpError(`File not found`, 404)
		}
		if (error instanceof Modifier.ModifierFileAccesError) {
			throw new errors.HttpError(`Forbidden`, 403)
		}
		if (error instanceof Modifier.ModifierSyntaxError) {
			throw new errors.HttpError(`Syntax error in file`, 500)
		}
		throw error
	}

	// Filter
	if (endpoint.filter) {
		logger.trace(
			{ module: 'location/endpoints', filter: endpoint.filter },
			`Starting filter...`,
		)
		try {
			const filter_file = path.resolve(config.server.path.filter, endpoint.filter)
			const fn = await imports.getFilterFn(filter_file)
			if (fn) {
				data = await fn(data, params)
				logger.trace({ module: 'location/endpoints', result: data }, `Filter successful.`)
			}
		} catch (error: any) {
			logger.debug({ module: 'location/endpoints', error })
			throw new errors.HttpError(`Endpoint filter failed`, 500)
		}
	}

	// Formatter
	try {
		data = await Formatter.format(data, style)
	} catch (error: any) {
		logger.debug({ module: 'location/endpoints', error })
		if (error instanceof Formatter.FormatterMissingError) {
			throw new errors.HttpError(`${error.message}`, 406)
		}
		throw error
	}

	// Send response
	const result = {
		content: data.content,
		mime: data.mime,
		file: file,
	}
	logger.trace({ module: 'location/endpoints', result }, `Request successfully handled.`)
	return result
}

/**
 * Match a pathname against configured endpoints.
 * @param pathname - URL pathname to match.
 * @returns Matched endpoint with parameters or null if none matches.
 */
function matchEndpoint(pathname: string) {
	for (const endpoint of _indexEndpoints) {
		if (endpoint.regex) {
			const matches = endpoint.regex.exec(pathname)
			if (matches) return { endpoint, params: matches.groups }
		} else {
			if (pathname.startsWith(endpoint.path)) return { endpoint }
		}
	}
	return null
}
