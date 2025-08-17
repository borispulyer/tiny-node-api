/*
 * Imports
 */
import path from 'node:path'
import * as Parser from '@/parser'
import * as Modifier from '@/modifier'
import * as Formatter from '@/formatter'
import * as errors from '@/errors'
import { config } from '@config'
import { files } from '@utils'

export async function filesystem(
	pathname: string,
): Promise<{ content: any; mime: string; file?: string } | undefined> {
	// Check Responsibility - Step 1
	// Check if filesystem is enabled in config
	if (!config.server.locations.filesystem) return undefined

	// Check Responsibility - Step 2
	// Get absolut path of requested file and check if file is within the root directory of the server
	const requested_file = path.resolve(config.server.root, pathname.replace(/^\/+/, ''))
	if (!files.isFileWithinRoot(requested_file)) return undefined

	// Check Responsibility - Step 3
	// Get source file
	const source_file = await getSourceFile(requested_file)
	if (!source_file) return undefined

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
		data = await Modifier.modify(data, modifiers, path.dirname(source_file))
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
		file: source_file,
	}
}

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
