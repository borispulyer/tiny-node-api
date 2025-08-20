/*
 * Imports
 */
import { config, logger } from '@/core'

export async function heartbeat(
	pathname: string,
): Promise<{ content: any; mime: string; file?: string } | undefined> {
	logger.trace(
		{ module: 'location/heartbeat', pathname },
		`Checking resbonsibility for current request...`,
	)
	// Check Responsibility
	if (!config.server.locations.heartbeat) return undefined
	if (!pathname.startsWith('/_heartbeat')) return undefined

	logger.trace(
		{ module: 'location/heartbeat' },
		`Module is reponsible for current request. Handling request...`,
	)

	// Handle heartbeat
	const result = {
		content: '❤',
		mime: 'text/plain',
	}
	logger.trace({ module: 'location/heartbeat', result }, `Request successfully handled.`)
	return result
}
