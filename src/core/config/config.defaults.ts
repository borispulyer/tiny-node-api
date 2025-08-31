/*
 * Imports
 */
import path from 'node:path'
import type * as Types from './config.types'

/**
 * Default configuration values
 */
const app_root: string = process.cwd()
export const configDefaults: Types.Config = {
	server: {
		port: 3000,
		path: {
			public: path.resolve(app_root, 'public'),
			filter: path.resolve(app_root, 'filter'),
		},
		locations: {
			heartbeat: true,
			endpoints: true,
			filesystem: true,
		},
		cache: {
			cacheControlHeader: 'stale-while-revalidate=300, stale-if-error=3600',
			cacheControlHeaderAuth: 'private, no-cache',
		},
		timeouts: {
			socket: 5_000,
			keepAlive: 75_000,
			headers: 80_000,
			request: 60_000,
		},
		maxRequestsPerSocket: 1_000,
	},
	filesystem: {
		resolve_extension: true,
	},
	endpoints: [],
	auth: {
		enable: false,
		oauth2: {
			issuerUri: null,
			jwksUri: null,
			audience: null,
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
	logging: {
		http: {
			enable: true,
			stdout: {
				enable: false,
				level: 'info',
			},
			filesystem: {
				enable: true,
				file: path.resolve(app_root, 'logs/access'),
				level: 'info',
				logrotation: {
					size: '10M',
					frequency: 'daily',
					limit: 180,
					extension: 'log',
					dateFormat: 'yyyy-MM-dd',
					symlink: false,
				},
			},
		},
		app: {
			enable: true,
			stdout: {
				enable: true,
				level: 'warn',
			},
			filesystem: {
				enable: true,
				file: path.resolve(app_root, 'logs/app'),
				level: 'info',
				logrotation: {
					size: '10M',
					frequency: 'daily',
					limit: 180,
					extension: 'log',
					dateFormat: 'yyyy-MM-dd',
					symlink: false,
				},
			},
		},
	},
}
