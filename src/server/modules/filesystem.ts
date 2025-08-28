/*
 * Imports
 */
import http from 'node:http'
import path from 'node:path'
import * as Errors from '../server.errors'
import type * as Types from '../server.types'
import { cache } from './'
import { files } from '@/core'

/**
 * Serve files from the filesystem based on request pathname.
 * @param pathname - Requested URL pathname.
 * @returns File payload or undefined if not responsible.
 */
export async function run(
	pathname: string,
	request: http.IncomingMessage,
	ctx: Types.ConstructorCtx,
): Promise<{ content: any; mime: string; file?: string } | undefined> {
	ctx.logger.trace(
		{ module: 'location/filesystem', pathname },
		`Checking responsibility for current request...`,
	)

	// Check Responsibility - Step 1
	// Check if filesystem is enabled in config
	if (!ctx.config.server.locations.filesystem) return undefined

	// Check Responsibility - Step 2
	// Get absolut path of requested file and check if file is within the root directory of the server
	const requested_file = path.resolve(ctx.config.server.path.public, pathname.replace(/^\/+/, ''))
	if (!(await files.isFileWithinRoot(requested_file, ctx.config.server.path.public)))
		return undefined

	// Check Responsibility - Step 3
	// Get source file
	const source_file = await getSourceFile(requested_file, ctx)
	if (!source_file) return undefined

	ctx.logger.trace(
		{ module: 'location/filesystem', source_file },
		`Module is responsible for current request. Handling request...`,
	)

	// Check cache headers
	const cacheHeaders = await cache.getCacheHeader(source_file)
	if (cache.hasNotModified(request.headers, cacheHeaders))
		throw new Errors.HttpNotModifiedError(cacheHeaders)

	// Get style of output format
	let style = path.extname(pathname).toLowerCase().replace(/^\./, '')
	if (!ctx.formatter.isFormatterRegistered(style)) {
		style = ctx.config.formatter.default
	}

	// Parser
	let data: any
	try {
		data = await ctx.parser.run(source_file)
	} catch (error: any) {
		ctx.logger.debug({ module: 'location/filesystem', error })
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
			data = await ctx.modifier.run(data, modifiers, path.dirname(source_file))
		} catch (error: any) {
			ctx.logger.debug({ module: 'location/filesystem', error })
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

	// Formatter
	try {
		data = await ctx.formatter.run(data, style)
	} catch (error: any) {
		ctx.logger.debug({ module: 'location/filesystem', error })
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
		lastModified: cacheHeaders?.['last-modified'],
	}
	ctx.logger.trace({ module: 'location/filesystem', result }, `Request successfully handled.`)
	return result
}

/**
 * Resolve the actual source file for a requested path, considering extension resolution.
 * @param requested_file - Path derived from the request.
 * @returns Absolute path of the found source file or null.
 */
async function getSourceFile(
	requested_file: string,
	ctx: Types.ConstructorCtx,
): Promise<string | null> {
	// Check if requested_file is existing
	if (await files.isFileExisting(requested_file)) return requested_file

	// Else, check extensions of all available parsers
	if (ctx.config.filesystem.resolve_extension) {
		const dir = path.dirname(requested_file)
		const filename = path.basename(requested_file, path.extname(requested_file))
		for (const ext of ctx.parser.getSupportedExtensions()) {
			const probe = path.join(dir, `${filename}.${ext}`)
			if (await files.isFileExisting(probe)) return probe
		}
	}

	// Else, give up
	return null
}
