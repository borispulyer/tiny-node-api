/*
 * Imports
 */

import * as formatters from './modules'
import * as errors from './errors'
import { logger } from '../core'

/*
 * Definitions
 */
const _formattersIndex: Map<string, formatters.Formatter> = (() => {
	const map: Map<string, formatters.Formatter> = new Map()
	for (const formatter of Object.values(formatters)) {
		for (const selector of formatter.selectors) {
			const sel = selector.toLowerCase()
			if (map.has(sel)) {
				throw new errors.FormatterError(
					`Duplicate formatter for selector "${sel}" detected.`,
				)
			}
			map.set(sel, formatter)
		}
	}
	return map
})()

/**
 * Format a JavaScript object and return a string.
 * @param data
 * @param selector
 * @returns
 */
export async function format(
	data: any,
	selector: string,
): Promise<{
	mime: formatters.Formatter['mime']
	content: string
}> {
	logger.trace({ module: 'formatter', data, selector }, `Starting formatter...`)
	const formatter = _formattersIndex.get(selector.toLowerCase().trim())
	if (!formatter) {
		throw new errors.FormatterMissingError(`No formatter for '${selector}' available.`)
	}
	try {
		const result = { mime: formatter.mime, content: await formatter.fn(data) }
		logger.trace({ module: 'formatter', result }, `Formatter successful.`)
		return result
	} catch (error: any) {
		logger.debug({ module: 'formatter', error })
		throw error
	}
}

export function isFormatterRegistered(selector: string): boolean {
	return _formattersIndex.has(selector.toLowerCase().trim())
}

export function getModules(): { id: string; selectors: string[]; mime: string }[] {
	const result = []
	for (const [key, value] of Object.entries(formatters)) {
		result.push({
			id: key,
			selectors: value.selectors,
			mime: value.mime,
		})
	}
	return result
}
