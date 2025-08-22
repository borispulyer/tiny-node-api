/*
 * Imports
 */
import path from 'node:path'
import fs from 'node:fs/promises'
import * as errors from '@/errors'
import { config, logger } from '@/core'

const _rootPublicRealpath: Promise<string | undefined> = (async () => {
	try {
		const root_absolute = path.resolve(config.server.path.public)
		const fsStats = await fs.stat(root_absolute).catch(() => null)
		if (!fsStats?.isDirectory()) return undefined
		const root_realpath = await fs.realpath(root_absolute)
		return root_realpath
	} catch (error: any) {
		logger.debug({ module: 'utils/files', error })
		throw error
	}
})()

export async function isFileWithinRoot(file: string): Promise<boolean> {
	try {
		if (!file || file.includes('\0') || !path.isAbsolute(file)) return false
		const file_realpath = await fs.realpath(path.resolve(file))
		const public_realpath = await _rootPublicRealpath
		if (!file_realpath || !public_realpath) return false

		const relative = path.relative(public_realpath, file_realpath)
		if (
			relative === '' ||
			(relative !== '..' &&
				!relative.startsWith('..' + path.sep) &&
				!path.isAbsolute(relative))
		) {
			return true
		}
		return false
	} catch (error: any) {
		logger.debug({ module: 'utils/files', error })
		if (error?.code === 'ENOENT') {
			return false
		}
		throw error
	}
}

export async function isFileExisting(file: string): Promise<boolean> {
	try {
		await fs.access(file)
		return true
	} catch {
		return false
	}
}

export async function isDirectoryExisting(dir: string): Promise<boolean> {
	try {
		const fsStats = await fs.stat(dir)
		return fsStats.isDirectory()
	} catch (error: any) {
		return false
	}
}
