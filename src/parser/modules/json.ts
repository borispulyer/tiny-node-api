/*
 * Imports
 */
import fs from 'node:fs/promises'
import type { Parser } from '.'

/**
 * JSON Parser
 */
export default {
	extensions: ['.json', '.jsonc'],
	fn: async (file: string): Promise<any> => {
		const content = await fs.readFile(file, { encoding: 'utf8' })
		return JSON.parse(content)
	},
} satisfies Parser
