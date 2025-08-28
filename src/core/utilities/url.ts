/*
 * Imports
 */
import path from 'node:path'
import { URL } from 'node:url'

/**
 * Extract a normalized pathname from a URL string.
 * @param url - URL or pathname provided by the client.
 * @returns Normalized pathname or undefined on failure.
 */
export function getPathname(url: string | undefined): string | undefined {
	try {
		if (url === undefined) return ''
		const { pathname } = new URL(url, 'http://dummy')
		return path.posix.normalize(decodeURIComponent(pathname).replace(/\\/g, '/'))
	} catch (error: any) {}
	return undefined
}
