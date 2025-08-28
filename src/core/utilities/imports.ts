/*
 * Imports
 */
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { files } from '@/core'

/*
 * Type Definitions
 */
export type FilterFn = (data: any, params?: Record<string, string>) => any | Promise<any>

/*
 * Definitions
 */
const _cacheFilterFn = new Map<string, FilterFn>()

/**
 * Load a filter function from file system with caching.
 * @param file - Absolute path of the filter module.
 * @param root - Absolute path of the root directory of the filter modules.
 * @returns Filter function if found, otherwise undefined.
 */
export async function getFilterFn(file: string, root: string): Promise<FilterFn | undefined> {
	// Valdiate
	if (!file || file.includes('\0') || !path.isAbsolute(file)) return undefined

	// Try to resolve function from cache...
	if (_cacheFilterFn.has(file)) return _cacheFilterFn.get(file)

	// ...otherwise load from file
	if (!(await files.isFileWithinRoot(file, root))) {
		throw new Error(`Module "${file}" is not within module root folder.`)
	}
	const module = await import(pathToFileURL(file).href)
	if (module && typeof module.default === 'function' && module.default) {
		_cacheFilterFn.set(file, module.default)
		return module.default
	} else {
		throw new Error(`Module "${file}" has no filter function as default export.`)
	}
}
