/*
 * Imports
 */
import path from 'node:path'
import { Config } from '@config/config.types'
import { HttpError } from '@/errors'

/**
 * Default configuration values
 */
export const defaults: Config = {
	server: {
		port: 3000,
		root: path.resolve(import.meta.dirname, '../../../', 'public'),
		locations: {
			heartbeat: true,
			endpoints: true,
			filesystem: true,
		},
		timeouts: {
			keepAlive: 75_000,
			headers: 80_000,
			request: 60_000,
		},
		maxRequestsPerSocket: 1_000,
	},
	filesystem: {
		resolve_extension: true,
	},
	endpoints: [
		{
			enable: true,
			path: '/api/v1/test',
			file: './dummy.yaml',
			format: 'json',
		},
	],
	auth: {
		enable: false,
		oauth2: {
			realm: 'Config API',
			issuerUri: undefined,
			jwksUri: undefined,
			audience: undefined,
		},
	},
	parser: {},
	modifier: {
		enable: true,
		modules: {
			include: true,
		},
	},
	formatter: {
		default: 'json',
	},
}
