/*
 * Imports
 */
import fs from 'node:fs/promises'
import type * as Types from '../parser.types'

/**
 * JSON Parser
 */
export default {
	extensions: ['json', 'jsonc'],
	/**
	 * Parse a JSON file into a JavaScript object.
	 * @param file - Absolute path of the JSON file.
	 * @returns Parsed JavaScript object.
	 */
	fn: async (file: string): Promise<any> => {
		const content = await fs.readFile(file, { encoding: 'utf8' })
		return JSON.parse(content)
	},
} satisfies Types.ParserModule
