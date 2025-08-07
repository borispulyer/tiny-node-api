/*
 * Imports
 */
import fs from 'node:fs/promises'
import yaml from 'yaml'
import type { Parser } from '.'

/**
 * YAML Parser
 */
export default {
	extensions: ['.yaml', '.yml'],
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
} satisfies Parser
