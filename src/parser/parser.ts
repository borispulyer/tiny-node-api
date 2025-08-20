/*
 * Imports
 */
import path from 'node:path'
import yaml from 'yaml'
import * as parsers from './modules'
import * as errors from './errors'
import { logger } from '../core'

/*
 * Definitions
 */
const _parsersIndex: Map<string, parsers.Parser> = (() => {
	const map: Map<string, parsers.Parser> = new Map()
	for (const parser of Object.values(parsers)) {
		for (const extension of parser.extensions) {
			const ext = extension.toLowerCase()
			if (map.has(ext)) {
				throw new errors.ParserError(`Duplicate parser for extension "${ext}" detected.`)
			}
			map.set(ext, parser)
		}
	}
	return map
})()

/**
 * Parse a file into a JavaScript object.
 * @param file
 * @returns
 */
export async function parse(file: string): Promise<any> {
	logger.trace({ module: 'parser', file }, `Starting parser...`)
	const file_extension = path.extname(file).toLowerCase().replace(/^\./, '')
	const parser = _parsersIndex.get(file_extension)
	if (!parser) {
		throw new errors.ParserMissingError(
			`No parser for extension "${file_extension}" available.`,
		)
	}
	try {
		const result = await parser.fn(file)
		logger.trace({ module: 'parser', result }, `Parsing successful.`)
		return result
	} catch (error: any) {
		logger.debug({ module: 'parser', error })
		if (error instanceof SyntaxError || error instanceof yaml.YAMLParseError) {
			throw new errors.ParserSyntaxError(`Syntax error in file "${file}".`)
		}
		if (error.code === 'ENOENT') {
			throw new errors.ParserFilereadError(`File "${file}" not found.`)
		}
		throw error
	}
}

export function isParserRegistered(file: string): boolean {
	return _parsersIndex.has(path.extname(file).toLowerCase().trim().replace(/^\./, ''))
}

export function getSupportedExtensions(): string[] {
	return [..._parsersIndex.keys()]
}

export function getModules(): { id: string; extensions: string[] }[] {
	const result = []
	for (const [key, value] of Object.entries(parsers)) {
		result.push({
			id: key,
			extensions: value.extensions,
		})
	}
	return result
}
