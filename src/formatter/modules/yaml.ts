/*
 * Imports
 */
import yaml from 'yaml'
import type * as Types from '../formatter.types'

/**
 * YAML Formatter
 */
export default {
	selectors: ['yaml', 'yml'],
	mime: 'application/x-yaml; charset=utf-8',
	fn: async (data: any): Promise<string> => {
		return yaml.stringify(data)
	},
} satisfies Types.FormatterModules
