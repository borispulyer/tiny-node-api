/*
 * Imports
 */
import path from 'node:path'
import fs from 'node:fs/promises'
import { config } from '@config'

const _rootRealpath: Promise<string> = (async () => {
	const root_absolute = path.resolve(config.server.root)

	const fsStats = await fs.stat(root_absolute).catch(() => null)
	if (!fsStats?.isDirectory()) {
		throw new Error('Server misconfigured: invalid server.root')
	}

	try {
		const root_realpath = await fs.realpath(root_absolute)
		return root_realpath
	} catch (error: any) {
		throw new Error(`Server misconfigured: ${error}`)
	}
})()

export async function isFileWithinRoot(file: string): Promise<boolean> {
	if (!file || file.includes('\0')) return false

	try {
		const file_realpath = await fs.realpath(path.resolve(file))

		// Plattform-sichere Containment-Prüfung
		const relative = path.relative(await _rootRealpath, file_realpath)
		if (
			relative === '' ||
			(relative !== '..' &&
				!relative.startsWith('..' + path.sep) &&
				!path.isAbsolute(relative))
		)
			return true
		return false
	} catch (error: any) {
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
