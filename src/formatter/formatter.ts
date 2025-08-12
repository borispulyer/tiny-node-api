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
	logger.debug(`Registering available FORMATTERS for the following formats:`)
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
		logger.debug(`  - ${formatter.selectors.map((value) => `"${value}"`).join(', ')}`)
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
	const formatter = _formattersIndex.get(selector.toLowerCase().trim())
	if (!formatter) {
		throw new errors.FormatterMissingError(`No formatter for '${selector}' available.`)
	}
	try {
		return { mime: formatter.mime, content: await formatter.fn(data) }
	} catch (error: any) {
		throw error
	}
}

export function isFormatterRegistered(selector: string): boolean {
	return _formattersIndex.has(selector.toLowerCase().trim())
}
