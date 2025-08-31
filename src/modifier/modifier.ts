/*
 * Imports
 */
import * as Modules from './modules'
import * as Errors from './modifier.errors'
import type * as Types from './modifier.types'

/**
 * Modifier service to apply transformation modules to data objects.
 */
export class Modifier {
	private _ctx
	private _index
	private _errors

	/**
	 * Exposes the modifier error types.
	 * @returns Error namespace with specific modifier errors.
	 */
	get ['errors']() {
		return this._errors
	}

	/**
	 * Creates a new modifier instance.
	 * @param ctx - Context with configuration, logger and parser.
	 * @param setup - Setup containing the module index.
	 */
	private constructor(ctx: Types.ConstructorCtx, setup: Types.ConstructorSetup) {
		this._ctx = ctx
		this._index = setup.index
		this._errors = Errors
	}

	/**
	 * Initializes the modifier service and registers modules.
	 * @param ctx - Initialization context.
	 * @returns Initialized `Modifier` instance.
	 */
	public static async init(ctx: Types.InitCtx): Promise<Modifier> {
		const index = await Modifier._createIndex()
		return new Modifier(
			{
				config: { server: { path: { public: ctx.config.server.path.public } } },
				logger: ctx.logger,
				parser: ctx.parser,
			},
			{ index },
		)
	}

	/**
	 * Apply one or more modifiers to a JavaScript object.
	 * @param data - Data object to modify.
	 * @param selector - Modifier identifier or list of identifiers.
	 * @param base_dir - Base directory for file-based modifiers.
	 * @returns Modified data object.
	 */
	public async run(
		data: any,
		selector: string | string[] | null,
		base_dir: string,
	): Promise<any> {
		try {
			this._ctx.logger.trace(
				{ module: 'modifier', data, selector, base_dir },
				`Starting modifier...`,
			)
			const selectors = Array.isArray(selector) ? selector : [selector]
			for (const selector of selectors) {
				if (!selector) continue
				const modifier = this._index.get(selector.toLowerCase().trim())
				if (!modifier) {
					throw new Errors.ModifierMissingError(
						`No modifier for '${selector}' available.`,
					)
				}
				data = await modifier.fn(data, { baseDir: base_dir }, this._ctx)
				this._ctx.logger.trace({ module: 'modifier', result: data }, `Modifier successful.`)
			}
			return data
		} catch (error: any) {
			this._ctx.logger.debug({ module: 'modifier', error })
			if (error instanceof Errors.ModifierError) {
				throw error
			}
			throw new Errors.ModifierError(`Modifier failed: ${error.message}`)
		}
	}

	/**
	 * Check whether a modifier exists for a selector.
	 * @param selector - Modifier selector to check.
	 * @returns True if modifier is registered.
	 */
	public isModifierRegistered(selector: string): boolean {
		return this._index.has(selector.toLowerCase().trim())
	}

	/**
	 * Retrieve meta information about registered modifier modules.
	 * @returns Array of modifier IDs and selectors.
	 */
	public getModules(): { id: string; selector: string }[] {
		const result = []
		for (const [key, value] of Object.entries(Modules)) {
			result.push({
				id: key,
				selector: value.selector,
			})
		}
		return result
	}

	/**
	 * Build the module index from available modifier modules.
	 * @returns Map from selector to modifier module.
	 * @throws {Errors.ModifierConfigurationError} If duplicate selectors are found.
	 */
	private static async _createIndex(): Promise<Types.ModifiersIndex> {
		const index = new Map()
		for (const modifier of Object.values(Modules)) {
			const sel = modifier.selector.toLowerCase()
			if (index.has(sel)) {
				throw new Errors.ModifierConfigurationError(
					`Duplicate modifier for selector "${sel}" detected.`,
				)
			}
			index.set(sel, modifier)
		}
		return index
	}
}
