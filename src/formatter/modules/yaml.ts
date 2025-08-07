/*
 * Imports
 */
import yaml from 'yaml'
import type { Formatter } from '.'

/**
 * YAML Formatter
 */
export default {
	selectors: ['yaml', 'yml'],
	mime: 'application/x-yaml; charset=utf-8',
	fn: async (data: any): Promise<string> => {
		return yaml.stringify(data)
	},
} satisfies Formatter
