/*
 * Imports
 */
import path from 'node:path'
import yaml from 'yaml'
import * as Modules from './modules'
import * as Errors from './parser.errors'
import type * as Types from './parser.types'

export class Parser {
	private _ctx
	private _index
	private _errors

	get ['errors']() {
		return this._errors
	}

	private constructor(ctx: Types.ConstructorCtx, setup: Types.ConstructorSetup) {
		this._ctx = ctx
		this._index = setup.index
		this._errors = Errors
	}

	public static async init(ctx: Types.InitCtx): Promise<Parser> {
		const index = Parser._createIndex()
		return new Parser({ logger: ctx.logger }, { index })
	}

	/**
	 * Parse a file into a JavaScript object.
	 * @param file - Absolute path of the file to parse.
	 * @returns Parsed content as JavaScript object.
	 */
	public async run(file: string): Promise<any> {
		try {
			this._ctx.logger.trace({ module: 'parser', file }, `Starting parser...`)
			const file_extension = path.extname(file).toLowerCase().replace(/^\./, '')
			const parser = this._index.get(file_extension)
			if (!parser) {
				throw new Errors.ParserMissingError(
					`No parser for extension "${file_extension}" available.`,
				)
			}
			const result = await parser.fn(file)
			this._ctx.logger.trace({ module: 'parser', result }, `Parsing successful.`)
			return result
		} catch (error: any) {
			this._ctx.logger.debug({ module: 'parser', error })
			if (error instanceof SyntaxError || error instanceof yaml.YAMLParseError) {
				throw new Errors.ParserSyntaxError(`Syntax error in file "${file}".`)
			}
			if (error.code === 'ENOENT') {
				throw new Errors.ParserFilereadError(`File "${file}" not found.`)
			}
			if (error instanceof Errors.ParserError) {
				throw error
			}
			throw new Errors.ParserError(`Parser failed: ${error.message}`)
		}
	}

	/**
	 * Check whether a parser exists for a given file.
	 * @param file - Path of the file to check.
	 * @returns True if a parser is registered for the file extension.
	 */
	public isParserRegistered(file: string): boolean {
		return this._index.has(path.extname(file).toLowerCase().trim().replace(/^\./, ''))
	}

	/**
	 * List supported file extensions.
	 * @returns Array of supported file extensions.
	 */
	public getSupportedExtensions(): string[] {
		return [...this._index.keys()]
	}

	/**
	 * Retrieve meta information about registered parser modules.
	 * @returns Array of parser module identifiers and their extensions.
	 */
	public getModules(): { id: string; extensions: string[] }[] {
		const result = []
		for (const [key, value] of Object.entries(Modules)) {
			result.push({
				id: key,
				extensions: value.extensions,
			})
		}
		return result
	}

	private static _createIndex(): Types.ParsersIndex {
		const index = new Map()
		for (const parser of Object.values(Modules)) {
			for (const extension of parser.extensions) {
				const ext = extension.toLowerCase()
				if (index.has(ext)) {
					throw new Errors.ParserConfigurationError(
						`Duplicate parser for extension "${ext}" detected.`,
					)
				}
				index.set(ext, parser)
			}
		}
		return index
	}
}
