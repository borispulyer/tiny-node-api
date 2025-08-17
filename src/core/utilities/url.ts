/*
 * Imports
 */
import path from 'node:path'
import { URL } from 'node:url'

export function getPathname(url: string | undefined): string {
	if (url === undefined) return ''
	const { pathname } = new URL(url, `http://dummy'}`)
	return path.posix.normalize(decodeURIComponent(pathname))
}
