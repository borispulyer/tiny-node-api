/*
 * Imports
 */
import path from 'node:path'
import { URL } from 'node:url'
import * as errors from '@/errors'
import { logger } from '@/core'

/**
 * Extract a normalized pathname from a URL string.
 * @param url - URL or pathname provided by the client.
 * @returns Normalized pathname or empty string on failure.
 */
export function getPathname(url: string | undefined): string {
	try {
		if (url === undefined) return ''
		const { pathname } = new URL(url, 'http://dummy')
		return path.posix.normalize(decodeURIComponent(pathname).replace(/\\/g, '/'))
	} catch (error: any) {
		logger.debug({ module: 'utils/url', error })
		throw new errors.HttpError('Bad request', 400)
	}
}
