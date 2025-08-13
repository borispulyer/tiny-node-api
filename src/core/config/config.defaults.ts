/*
 * Imports
 */
import path from 'node:path'
import { Config } from '@config/config.types'

/**
 * Default configuratiopn values
 */
export const defaults: Config = {
	server: {
		port: 3000,
		root: path.resolve(import.meta.dirname, '..', 'public'),
	},
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
