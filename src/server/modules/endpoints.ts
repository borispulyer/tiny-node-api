/*
 * Imports
 */
import http from 'node:http'
import path from 'node:path'
import * as Errors from '../server.errors'
import type * as Types from '../server.types'
import { cache } from './'
import { imports } from '@/core'

/*
 * Definitions
 */
const _indexEndpoints: {
	path: string
	file: string
	format: string | undefined
	filter: string | undefined
	regex?: RegExp
	params?: string[]
}[] = []

/**
 * Handle configured endpoint requests.
 * @param pathname - Requested URL pathname.
 * @returns Endpoint payload or undefined if not responsible.
 */
export async function run(
	pathname: string,
	request: http.IncomingMessage,
	ctx: Types.ConstructorCtx,
): Promise<{ content: any; mime: string; file?: string } | undefined> {
	ctx.logger.trace(
		{ module: 'location/endpoints', pathname },
		`Checking responsibility for current request...`,
	)

	// Check Responsibility - Step 1
	// Check if filesystem is enabled in config
	if (!ctx.config.server.locations.endpoints) return undefined

	// Check Responsibility - Step 2
	// Check if pathname matches an endpoint
	const requested_endpoint = matchEndpoint(pathname)
	if (!requested_endpoint) return undefined

	ctx.logger.trace(
		{ module: 'location/endpoints', requested_endpoint },
		`Module is responsible for current request. Handling request...`,
	)

	const { endpoint, params } = requested_endpoint
	const file = path.resolve(ctx.config.server.path.public, endpoint.file)

	// Check cache headers
	const cacheHeaders = await cache.getCacheHeader(file)
	if (cache.hasNotModified(request.headers, cacheHeaders))
		throw new Errors.HttpNotModifiedError(cacheHeaders)

	// Get style of output format
	let style = endpoint.format ?? path.extname(endpoint.file).toLowerCase().replace(/^\./, '')
	if (!ctx.formatter.isFormatterRegistered(style)) {
		style = ctx.config.formatter.default
	}

	// Parser
	let data: any
	try {
		data = await ctx.parser.run(file)
	} catch (error: any) {
		ctx.logger.debug({ module: 'location/endpoints', error })
		if (error instanceof ctx.parser.errors.ParserConfigurationError) {
			throw new Errors.HttpError(`Parser configuration error`, 500)
		}
		if (error instanceof ctx.parser.errors.ParserMissingError) {
			throw new Errors.HttpError(`${error.message}`, 404)
		}
		if (error instanceof ctx.parser.errors.ParserFilereadError) {
			throw new Errors.HttpError(`File not found`, 404)
		}
		if (error instanceof ctx.parser.errors.ParserSyntaxError) {
			throw new Errors.HttpError(`Syntax error in file`, 500)
		}
		throw error
	}

	// Modifier
	if (ctx.config.modifier.enable) {
		const modifiers = [ctx.config.modifier.modules.include && 'include'].filter(
			(x): x is string => Boolean(x),
		)
		try {
			data = await ctx.modifier.run(data, modifiers, path.dirname(file))
		} catch (error: any) {
			ctx.logger.debug({ module: 'location/endpoints', error })
			if (error instanceof ctx.modifier.errors.ModifierConfigurationError) {
				throw new Errors.HttpError(`Modifier configuration error`, 500)
			}
			if (error instanceof ctx.modifier.errors.ModifierMissingError) {
				throw new Errors.HttpError(`${error.message}`, 500)
			}
			if (error instanceof ctx.modifier.errors.ModifierFileReadError) {
				throw new Errors.HttpError(`File not found`, 404)
			}
			if (error instanceof ctx.modifier.errors.ModifierFileAccesError) {
				throw new Errors.HttpError(`Forbidden`, 403)
			}
			if (error instanceof ctx.modifier.errors.ModifierSyntaxError) {
				throw new Errors.HttpError(`Syntax error in file`, 500)
			}
			throw error
		}
	}

	// Filter
	if (endpoint.filter) {
		ctx.logger.trace(
			{ module: 'location/endpoints', filter: endpoint.filter },
			`Starting filter...`,
		)
		try {
			const filter_file = path.resolve(ctx.config.server.path.filter, endpoint.filter)
			const fn = await imports.getFilterFn(filter_file, ctx.config.server.path.filter)
			if (fn) {
				data = await fn(data, params)
				ctx.logger.trace(
					{ module: 'location/endpoints', result: data },
					`Filter successful.`,
				)
			}
		} catch (error: any) {
			ctx.logger.debug({ module: 'location/endpoints', error })
			throw new Errors.HttpError(`Endpoint filter failed`, 500)
		}
	}

	// Formatter
	try {
		data = await ctx.formatter.run(data, style)
	} catch (error: any) {
		ctx.logger.debug({ module: 'location/endpoints', error })
		if (error instanceof ctx.formatter.errors.FormatterConfigurationError) {
			throw new Errors.HttpError(`Formatter configuration error`, 500)
		}
		if (error instanceof ctx.formatter.errors.FormatterMissingError) {
			throw new Errors.HttpError(`${error.message}`, 406)
		}
		throw error
	}

	// Send response
	const result = {
		content: data.content,
		mime: data.mime,
		etag: cacheHeaders?.etag,
		last_modified: cacheHeaders?.['last-modified'],
	}
	ctx.logger.trace({ module: 'location/endpoints', result }, `Request successfully handled.`)
	return result
}

export function createIndex(endpoints: Types.ConstructorCtx['config']['endpoints']): void {
	_indexEndpoints.length = 0

	for (const endpoint of endpoints) {
		// Skip disabled endpoints
		if (!endpoint.enable) continue

		if (!endpoint.path.includes('{')) {
			// Path contains no paramters -> 'static'
			_indexEndpoints.push({
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
			_indexEndpoints.push({
				path: endpoint.path,
				file: endpoint.file,
				format: endpoint.format,
				filter: endpoint.filter,
				regex: new RegExp(`^${escaped}/?$`),
				params: params,
			})
		}
	}
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
