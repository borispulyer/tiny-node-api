/*
 * Imports
 */
import http from 'node:http'
import path from 'node:path'
import fs from 'node:fs/promises'
import * as errors from '../errors'
import { logger } from '@/core'

export async function getCacheHeader(file: string): Promise<http.OutgoingHttpHeaders | undefined> {
	try {
		if (!file || file.includes('\0') || !path.isAbsolute(file)) return undefined
		const fsStats = await fs.stat(file).catch(() => null)
		if (!fsStats?.isFile()) return undefined
		return {
			etag: `W/"${Math.trunc(fsStats.mtimeMs)}-${fsStats.size}"`,
			'last-modified': new Date(fsStats.mtimeMs).toUTCString(),
		}
	} catch (error: any) {
		logger.debug({ module: 'server/cache', error })
		throw new errors.HttpError(`Internal server error`, 500)
	}
}

export function hasNotModified(
	requestHeaders: http.OutgoingHttpHeaders | undefined,
	responseHeaders: http.OutgoingHttpHeaders | undefined,
): boolean {
	if (!requestHeaders || !responseHeaders) return false
	// if-none-match
	if (requestHeaders['if-none-match'] === responseHeaders['etag']) return true
	// if-modified-since
	const ims = requestHeaders['if-modified-since']
	const lm = responseHeaders['last-modified']
	if (ims && lm && new Date(ims).getTime() >= new Date(lm).getTime()) return true
	// File has modified
	return false
}
