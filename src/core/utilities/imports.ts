/*
 * Imports
 */
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import * as errors from '@/errors'
import { logger } from '@/core'

export type FilterFn = (data: any, params?: Record<string, string>) => any | Promise<any>

const _cacheFilterFn = new Map<string, FilterFn>()

export async function getFilterFn(file: string): Promise<FilterFn | undefined> {
	try {
		// Valdiate
		if (!file || file.includes('\0') || !path.isAbsolute(file)) return undefined

		// Try to resolve function from cache...
		if (_cacheFilterFn.has(file)) return _cacheFilterFn.get(file)

		// ...otherwise load from file
		const module = await import(pathToFileURL(file).href)
		if (module && typeof module.default === 'function' && module.default) {
			_cacheFilterFn.set(file, module.default)
			return module.default
		} else {
			throw new errors.ConfigurationError(
				`Modul "${file}" exportiert keine Filter-Funktion als default`,
			)
		}
	} catch (error: any) {
		logger.debug({ module: 'utils/imports', error })
		throw new errors.ConfigurationError(`${error.message}`)
	}
}
