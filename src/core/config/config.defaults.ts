/*
 * Imports
 */
import path from 'node:path'
import { configTypes } from '@config'
import { info } from 'node:console'

const app_root: string = path.resolve(import.meta.dirname, '../../../')

/**
 * Default configuration values
 */
export const defaults: configTypes.Config = {
	server: {
		port: 3000,
		root: path.resolve(app_root, 'public'),
		locations: {
			heartbeat: true,
			endpoints: true,
			filesystem: true,
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
			level: 'info',
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
				},
			},
		},
		app: {
			enable: true,
			level: 'info',
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
				},
			},
		},
	},
}
