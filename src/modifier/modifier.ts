/*
 * Imports
 */

import * as modifiers from './modules'
import * as errors from './errors'
import { logger } from '../core'

/*
 * Definitions
 */
const _modifiersIndex: Map<string, modifiers.Modifier> = (() => {
	const map: Map<string, modifiers.Modifier> = new Map()
	for (const modifier of Object.values(modifiers)) {
		const sel = modifier.selector.toLowerCase()
		if (map.has(sel)) {
			throw new errors.ModifierError(`Duplicate modifier for selector "${sel}" detected.`)
		}
		map.set(sel, modifier)
	}
	logger.debug('Creating index of available modifiers.')
	return map
})()

/**
 * Modify a JavaScript object and return.
 */
export async function modify(
	data: any,
	selector: string | string[] | null,
	base_dir: string,
): Promise<any> {
	const selectors = Array.isArray(selector) ? selector : [selector]
	for (const selector of selectors) {
		if (!selector) continue
		const modifier = _modifiersIndex.get(selector.toLowerCase().trim())
		if (!modifier) {
			throw new errors.ModifierMissingError(`No modifier for '${selector}' available.`)
		}
		try {
			data = await modifier.fn(data, { baseDir: base_dir })
		} catch (error: any) {
			if (error.code === 'ENOENT') {
				throw new errors.ModifierFilereadError(error.message ?? `File read error found`)
			}
			throw error
		}
	}
	return data
}

export function isModifierRegistered(selector: string): boolean {
	return _modifiersIndex.has(selector.toLowerCase().trim())
}
