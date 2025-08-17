/*
 * Imports
 */
import { config } from '@/core'

export async function heartbeat(
	pathname: string,
): Promise<{ content: any; mime: string; file?: string } | undefined> {
	// Check Responsibility
	if (!config.server.locations.heartbeat) return undefined
	if (!pathname.startsWith('/_heartbeat')) return undefined

	// Handle heartbeat
	return {
		content: '❤',
		mime: 'text/plain',
	}
}
