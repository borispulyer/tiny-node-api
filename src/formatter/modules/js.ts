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
	/**
	 * Format data as JavaScript module export.
	 * @param data - Data to include in module.
	 * @returns JavaScript module string exporting the data.
	 */
	fn: async (data: any): Promise<string> => {
		return `export default ${JSON.stringify(data)};`
	},
} satisfies Formatter
