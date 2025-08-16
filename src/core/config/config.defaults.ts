/*
 * Imports
 */
import path from 'node:path'
import { Config } from '@config/config.types'
import { HttpError } from '@/errors'

/**
 * Default configuratiopn values
 */
export const defaults: Config = {
	server: {
		port: 3000,
		root: path.resolve(import.meta.dirname, '../../../', 'public'),
		locations: {
			heartbeat: true,
			endpoints: true,
			files: true,
		},
	},
	files: {
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
			issuer_uri: undefined,
			jwks_uri: undefined,
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
