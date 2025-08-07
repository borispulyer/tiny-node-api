/*
 * Imports
 */
import type { Formatter } from '.'

/**
 * JavaScript Formatter
 */
export default {
	selectors: ['js', 'javascript'],
	mime: 'application/javascript; charset=utf-8',
	fn: async (data: any): Promise<string> => {
		return `export default ${JSON.stringify(data)};`
	},
} satisfies Formatter
