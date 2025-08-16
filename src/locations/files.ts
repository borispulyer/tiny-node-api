/*
 * Imports
 */
import http from 'node:http'
import path from 'node:path'
import fs from 'node:fs/promises'
import * as Parser from '@/parser'
import * as Modifier from '@/modifier'
import * as Formatter from '@/formatter'
import * as errors from '@/errors'
import { config } from '@config'
import { logger } from '@/core'

export async function files(
	pathname: string,
	server: { request?: http.IncomingMessage; response: http.ServerResponse; t0?: number },
): Promise<boolean> {
	// Check Responsibility - Step 1
	// Get absolut path of requested file and check if file is within the root directory of the server
	const requested_file = path.resolve(
		config.server.root,
		path.posix.normalize(pathname).replace(/^\/+/, ''),
	)
	if (!requested_file.startsWith(config.server.root)) return false

	// Check Responsibility - Step 2
	// Get source file
	const source_file = await getSourceFile(requested_file)
	if (!source_file) return false

	// Get style of output format
	const style = path.extname(pathname).toLowerCase().replace(/^\./, '')
	if (!Formatter.isFormatterRegistered(style))
		throw new errors.HttpError(`No formatter for '${style}' available.`, 400)

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
		if (error instanceof Modifier.ModifierFilereadError) {
			throw new errors.HttpError(`[${error.name}] ${error.message}`, 404)
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
			throw new errors.HttpError(`[${error.name}] ${error.message}`, 400)
		}
		throw error
	}

	const t1 = performance.now()

	// Send response
	server.response.writeHead(200, { 'Content-Type': data.mime }).end(data.content)
	logger.info(
		`GET "${pathname}" -> "${source_file}" as ${style || 'default'}\t${server.t0 ? (t1 - server.t0).toFixed(2) : '-'} ms`,
	)
	return true
}

async function getSourceFile(requested_file: string): Promise<string | null> {
	// Check if requested_file is existing
	if (await isFileExisting(requested_file)) return requested_file

	// Else, check extensions of all available parsers
	if (config.files.resolve_extension) {
		const dir = path.dirname(requested_file)
		const filename = path.basename(requested_file, path.extname(requested_file))
		for (const ext of Parser.getSupportedExtensions()) {
			const probe = path.join(dir, `${filename}.${ext}`)
			if (await isFileExisting(probe)) return probe
		}
	}

	// Else, give up
	return null
}

async function isFileExisting(file: string): Promise<boolean> {
	try {
		await fs.access(file)
		return true
	} catch {
		return false
	}
}
