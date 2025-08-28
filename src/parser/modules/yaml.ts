/*
 * Imports
 */
import fs from 'node:fs/promises'
import yaml from 'yaml'
import type * as Types from '../parser.types'

/**
 * YAML Parser
 */
export default {
	extensions: ['yaml', 'yml'],
	/**
	 * Parse a YAML file into a JavaScript object.
	 * @param file - Absolute path of the YAML file.
	 * @returns Parsed JavaScript object.
	 */
	fn: async (file: string): Promise<any> => {
		const raw = await fs.readFile(file, { encoding: 'utf8' })
		return yaml.parse(raw, {
			customTags: [
				{
					tag: '!include',
					identify: (v: unknown) => typeof v === 'string',
					resolve: (ref: string) => ({ __include__: ref }),
				},
			],
		})
	},
} satisfies Types.ParserModule
