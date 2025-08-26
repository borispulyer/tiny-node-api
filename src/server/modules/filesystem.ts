/*
 * Imports
 */
import http from 'node:http'
import path from 'node:path'
import * as Parser from '@/parser'
import * as Modifier from '@/modifier'
import * as Formatter from '@/formatter'
import * as errors from '../errors'
import { getCacheHeader, hasNotModified } from './'
import { config, logger, files } from '@/core'

/**
 * Serve files from the filesystem based on request pathname.
 * @param pathname - Requested URL pathname.
 * @returns File payload or undefined if not responsible.
 */
export async function filesystem(
	pathname: string,
	request: http.IncomingMessage,
): Promise<{ content: any; mime: string; file?: string } | undefined> {
	logger.trace(
		{ module: 'location/filesystem', pathname },
		`Checking responsibility for current request...`,
	)

	// Check Responsibility - Step 1
	// Check if filesystem is enabled in config
	if (!config.server.locations.filesystem) return undefined

	// Check Responsibility - Step 2
	// Get absolut path of requested file and check if file is within the root directory of the server
	const requested_file = path.resolve(config.server.path.public, pathname.replace(/^\/+/, ''))
	if (!(await files.isFileWithinRoot(requested_file))) return undefined

	// Check Responsibility - Step 3
	// Get source file
	const source_file = await getSourceFile(requested_file)
	if (!source_file) return undefined

	logger.trace(
		{ module: 'location/filesystem', source_file },
		`Module is responsible for current request. Handling request...`,
	)

	// Check cache headers
	const cacheHeaders = await getCacheHeader(source_file)
	if (hasNotModified(request.headers, cacheHeaders))
		throw new errors.HttpNotModifiedError(cacheHeaders)

	// Get style of output format
	let style = path.extname(pathname).toLowerCase().replace(/^\./, '')
	if (!Formatter.isFormatterRegistered(style)) {
		style = config.formatter.default
	}

	// Parser
	let data: any
	try {
		data = await Parser.parse(source_file)
	} catch (error: any) {
		logger.debug({ module: 'location/filesystem', error })
		if (error instanceof Parser.ParserMissingError) {
			throw new errors.HttpError(`${error.message}`, 500)
		}
		if (error instanceof Parser.ParserFilereadError) {
			throw new errors.HttpError(`Not found`, 404)
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
		data = await Modifier.modify(data, modifiers, path.dirname(source_file))
	} catch (error: any) {
		logger.debug({ module: 'location/filesystem', error })
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

	// Formatter
	try {
		data = await Formatter.format(data, style)
	} catch (error: any) {
		logger.debug({ module: 'location/filesystem', error })
		if (error instanceof Formatter.FormatterMissingError) {
			throw new errors.HttpError(`${error.message}`, 406)
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
	logger.trace({ module: 'location/filesystem', result }, `Request successfully handled.`)
	return result
}

/**
 * Resolve the actual source file for a requested path, considering extension resolution.
 * @param requested_file - Path derived from the request.
 * @returns Absolute path of the found source file or null.
 */
async function getSourceFile(requested_file: string): Promise<string | null> {
	// Check if requested_file is existing
	if (await files.isFileExisting(requested_file)) return requested_file

	// Else, check extensions of all available parsers
	if (config.filesystem.resolve_extension) {
		const dir = path.dirname(requested_file)
		const filename = path.basename(requested_file, path.extname(requested_file))
		for (const ext of Parser.getSupportedExtensions()) {
			const probe = path.join(dir, `${filename}.${ext}`)
			if (await files.isFileExisting(probe)) return probe
		}
	}

	// Else, give up
	return null
}
