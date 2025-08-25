/*
 * Imports
 */

import * as formatters from './modules'
import * as errors from './errors'
import { logger } from '../core'

/*
 * Definitions
 */

// Create a Map of all available formatters
const _indexFormatters: Map<string, formatters.Formatter> = (() => {
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
 * Handle JavaScript object to string conversion.
 * @param data - Input data to format.
 * @param selector - Formatter selector identifying the output format.
 * @returns Object containing MIME type and formatted content.
 * @throws {errors.FormatterMissingError} Throws if no formatter for selector available.
 * @throws {errors.FormatterError} Throws if formatting failed for other reasons.
 */
export async function format(
	data: any,
	selector: string,
): Promise<{
	mime: formatters.Formatter['mime']
	content: string
}> {
	try {
		logger.trace({ module: 'formatter', data, selector }, `Starting formatter...`)
		const formatter = _indexFormatters.get(selector.toLowerCase().trim())
		if (!formatter) {
			throw new errors.FormatterMissingError(`No formatter for '${selector}' available.`)
		}
		const result = { mime: formatter.mime, content: await formatter.fn(data) }
		logger.trace({ module: 'formatter', result }, `Formatter successful.`)
		return result
	} catch (error: any) {
		logger.debug({ module: 'formatter', error })
		if (error instanceof errors.FormatterError) {
			throw error
		}
		throw new errors.FormatterError(`Formatting failed: ${error.message}`)
	}
}

/**
 * Check whether a formatter exists for a selector.
 * @param selector - Formatter selector to check.
 * @returns True if formatter is registered.
 */
export function isFormatterRegistered(selector: string): boolean {
	return _indexFormatters.has(selector.toLowerCase().trim())
}

/**
 * Retrieve meta information about registered formatter modules.
 * @returns Array of formatter IDs, selectors and MIME types.
 */
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
