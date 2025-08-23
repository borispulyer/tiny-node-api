/*
 * Imports
 */
import type { Formatter } from '.'

/**
 * JSON Formatter
 */
export default {
	selectors: ['json', 'jsonc'],
	mime: 'application/json; charset=utf-8',
	/**
	 * Format data as JSON string.
	 * @param data - Data to stringify.
	 * @returns JSON string.
	 */
	fn: async (data: any): Promise<string> => {
		return JSON.stringify(data)
	},
} satisfies Formatter
