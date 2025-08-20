/*
 * Imports
 */
import path from 'node:path'
import fs from 'node:fs/promises'
import * as errors from '@/errors'
import { config, logger } from '@/core'

const { root } = config.server

const _rootRealpath: Promise<string> = (async () => {
	const root_absolute = path.resolve(root)

	const fsStats = await fs.stat(root_absolute).catch(() => null)
	if (!fsStats?.isDirectory()) {
		throw new errors.ConfigurationError(
			'Server misconfigured: config.server.root must be a directory.',
			config.server,
		)
	}

	try {
		const root_realpath = await fs.realpath(root_absolute)
		return root_realpath
	} catch (error: any) {
		logger.debug({ module: 'utils/files', error })
		throw new errors.ConfigurationError(`Server misconfigured: ${error}`, config.server)
	}
})()

export async function isFileWithinRoot(file: string): Promise<boolean> {
	if (!file || file.includes('\0')) return false

	try {
		const file_realpath = await fs.realpath(path.resolve(file))
		const relative = path.relative(await _rootRealpath, file_realpath)
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
