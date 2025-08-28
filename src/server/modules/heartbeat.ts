/*
 * Imports
 */
import type * as Types from '../server.types'

/**
 * Handle heartbeat requests and respond with a simple message.
 * @param pathname - Requested URL pathname.
 * @returns Heartbeat payload or undefined if not responsible.
 */
export async function run(
	pathname: string,
	ctx: Types.ConstructorCtx,
): Promise<{ content: any; mime: string; file?: string } | undefined> {
	ctx.logger.trace(
		{ module: 'location/heartbeat', pathname },
		`Checking responsibility for current request...`,
	)
	// Check Responsibility
	if (!ctx.config.server.locations.heartbeat) return undefined
	if (!pathname.startsWith('/_heartbeat')) return undefined

	ctx.logger.trace(
		{ module: 'location/heartbeat' },
		`Module is responsible for current request. Handling request...`,
	)

	// Handle heartbeat
	const result = {
		content: '❤',
		mime: 'text/plain',
	}
	ctx.logger.trace({ module: 'location/heartbeat', result }, `Request successfully handled.`)
	return result
}
