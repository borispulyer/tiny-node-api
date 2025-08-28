/*
 * Imports
 */
import * as Modules from './modules'
import * as Errors from './formatter.errors'
import type * as Types from './formatter.types'

export class Formatter {
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

	public static async init(ctx: Types.InitCtx): Promise<Formatter> {
		const index = await Formatter._createIndex()
		return new Formatter({ logger: ctx.logger }, { index })
	}

	/**
	 * Handle JavaScript object to string conversion.
	 * @param data - Input data to format.
	 * @param selector - Formatter selector identifying the output format.
	 * @returns Object containing MIME type and formatted content.
	 * @throws {FormatterMissingError} Throws if no formatter for selector available.
	 * @throws {FormatterError} Throws if formatting failed for other reasons.
	 */
	public async run(
		data: any,
		selector: string,
	): Promise<{
		mime: Types.FormatterModules['mime']
		content: string
	}> {
		try {
			this._ctx.logger.trace({ module: 'formatter', data, selector }, `Starting formatter...`)
			const formatter = this._index.get(selector.toLowerCase().trim())
			if (!formatter) {
				throw new Errors.FormatterMissingError(`No formatter for '${selector}' available.`)
			}
			const result = { mime: formatter.mime, content: await formatter.fn(data) }
			this._ctx.logger.trace({ module: 'formatter', result }, `Formatter successful.`)
			return result
		} catch (error: any) {
			this._ctx.logger.debug({ module: 'formatter', error })
			if (error instanceof Errors.FormatterError) {
				throw error
			}
			throw new Errors.FormatterError(`Formatting failed: ${error.message}`)
		}
	}

	/**
	 * Check whether a formatter exists for a selector.
	 * @param selector - Formatter selector to check.
	 * @returns True if formatter is registered.
	 */
	public isFormatterRegistered(selector: string): boolean {
		return this._index.has(selector.toLowerCase().trim())
	}

	/**
	 * Retrieve meta information about registered formatter modules.
	 * @returns Array of formatter IDs, selectors and MIME types.
	 */
	public getModules(): { id: string; selectors: string[]; mime: string }[] {
		const result = []
		for (const [key, value] of Object.entries(Modules)) {
			result.push({
				id: key,
				selectors: value.selectors,
				mime: value.mime,
			})
		}
		return result
	}

	private static async _createIndex(): Promise<Types.FormattersIndex> {
		const index = new Map()
		for (const formatter of Object.values(Modules)) {
			for (const selector of formatter.selectors) {
				const sel = selector.toLowerCase()
				if (index.has(sel)) {
					throw new Errors.FormatterConfigurationError(
						`Duplicate formatter for selector "${sel}" detected.`,
					)
				}
				index.set(sel, formatter)
			}
		}
		return index
	}
}
