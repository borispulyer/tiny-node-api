/*
 * Imports
 */
import http from 'node:http'
import { config } from '@/core'
import { logger } from '@/core'

export async function heartbeat(
	pathname: string,
	server: { request?: http.IncomingMessage; response: http.ServerResponse; t0?: number },
): Promise<boolean> {
	// Check Responsibility
	if (!config.server.locations.heartbeat) return false
	if (!pathname.startsWith('/_heartbeat')) return false

	// Handle hartbeat
	const t1 = performance.now()
	server.response.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' }).end('❤')
	logger.info(
		`${server.request?.method} "${pathname}" \t${server.t0 ? (t1 - server.t0).toFixed(2) : '-'} ms`,
	)
	return true
}
