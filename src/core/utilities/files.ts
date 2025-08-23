/*
 * Imports
 */
import path from 'node:path'
import fs from 'node:fs/promises'
import { config, logger } from '@/core'

export async function isFileWithinRoot(
	file: string,
	id: keyof typeof config.server.path = 'public',
): Promise<boolean> {
	try {
		if (!file || file.includes('\0') || !path.isAbsolute(file)) return false
		const relative = path.relative(config.server.path[id], file)
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
