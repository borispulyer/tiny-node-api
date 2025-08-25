/*
 * Imports
 */
import path from 'node:path'
import fs from 'node:fs/promises'
import { config, logger } from '@/core'

/**
 * Check whether a file resides inside a configured root directory. It does not validate symlinks.
 * @param file - Absolute path of the file to inspect.
 * @param id - Key of the root directory within configuration.
 * @returns True if file is inside the root directory, otherwise false.
 */
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

/**
 * Determine if a file exists on the filesystem.
 * @param file - Absolute path of the file to check.
 * @returns True if the file exists, otherwise false.
 */
export async function isFileExisting(file: string): Promise<boolean> {
	try {
		await fs.access(file)
		return true
	} catch {
		return false
	}
}

/**
 * Determine if a path points to an existing directory.
 * @param dir - Absolute path of the directory to check.
 * @returns True if the directory exists, otherwise false.
 */
export async function isDirectoryExisting(dir: string): Promise<boolean> {
	try {
		const fsStats = await fs.stat(dir)
		return fsStats.isDirectory()
	} catch (error: any) {
		return false
	}
}
