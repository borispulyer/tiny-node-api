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
	fn: async (data: any): Promise<string> => {
		return JSON.stringify(data)
	},
} satisfies Formatter
