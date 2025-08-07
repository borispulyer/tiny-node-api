/*
 * Imports
 */
import path from 'node:path'
import * as errors from '../errors'
import * as Parser from '@/parser'
import { logger } from '@/core'
import type { Modifier } from '.'

export default {
	selector: 'include',
	fn: async (data: any, options: any): Promise<any> => {
		async function _walk(node: any, base_dir: string): Promise<any> {
			if (!node) return node

			if (Array.isArray(node)) {
				return Promise.all(node.map((node) => _walk(node, base_dir)))
			}

			if (typeof node === 'object') {
				if (typeof node['__include__'] === 'string') {
					const file = path.resolve(base_dir, node['__include__'])

					if (seen.has(file)) {
						throw new errors.ModifierSyntaxError(`Multiple __include__ of "${file}"`)
					}
					seen.add(file)

					try {
						return await _walk(await Parser.parse(file), path.dirname(file))
					} catch (error: any) {
						if (error instanceof Parser.ParserError) {
							return node
						}
						throw error
					}
				}
				for (const key of Object.keys(node)) {
					node[key] = await _walk(node[key], base_dir)
				}
			}
			return node
		}

		const seen: Set<string> = new Set<string>()
		if (!options.baseDir) throw new errors.ModifierError(`options.baseDir is mandatory`)
		return await _walk(data, options.baseDir)
	},
} satisfies Modifier
