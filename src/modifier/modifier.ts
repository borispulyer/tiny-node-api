/*
 * Imports
 */

import * as modifiers from './modules'
import * as errors from './errors'
import { logger } from '../core'

/*
 * Definitions
 */
const _indexModifiers: Map<string, modifiers.Modifier> = (() => {
	const map: Map<string, modifiers.Modifier> = new Map()
	for (const modifier of Object.values(modifiers)) {
		const sel = modifier.selector.toLowerCase()
		if (map.has(sel)) {
			throw new errors.ModifierError(`Duplicate modifier for selector "${sel}" detected.`)
		}
		map.set(sel, modifier)
	}
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
	logger.trace({ module: 'modifier', data, selector, base_dir }, `Starting modifier...`)
	const selectors = Array.isArray(selector) ? selector : [selector]
	for (const selector of selectors) {
		if (!selector) continue
		const modifier = _indexModifiers.get(selector.toLowerCase().trim())
		if (!modifier) {
			throw new errors.ModifierMissingError(`No modifier for '${selector}' available.`)
		}
		try {
			data = await modifier.fn(data, { baseDir: base_dir })
			logger.trace({ module: 'modifier', result: data }, `Modifier successful.`)
			return data
		} catch (error: any) {
			logger.debug({ module: 'modifier', error })
			throw error
		}
	}
}

export function isModifierRegistered(selector: string): boolean {
	return _indexModifiers.has(selector.toLowerCase().trim())
}

export function getModules(): { id: string; selector: string }[] {
	const result = []
	for (const [key, value] of Object.entries(modifiers)) {
		result.push({
			id: key,
			selector: value.selector,
		})
	}
	return result
}
