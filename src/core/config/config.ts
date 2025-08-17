/*
 * Imports
 */
import path from 'node:path'
import { Config } from '@config/config.types'
import { defaults } from '@config/config.defaults'
import { parsers, objects, types } from '@utils'

/**
 * Assign environment variables to config and merge with defaults
 */
const env: types.DeepPartial<Config> = {
	server: {
		port: parsers.parsePort(process.env.SERVER_PORT),
		root: parsers.parseString(process.env.SERVER_ROOT)
			? path.resolve(
					import.meta.dirname,
					'..',
					parsers.parseString(process.env.SERVER_ROOT) as string,
				)
			: undefined,
		locations: {
			heartbeat: parsers.parseBool(process.env.SERVER_LOCATIONS_HEARTBEAT),
			endpoints: parsers.parseBool(process.env.SERVER_LOCATIONS_ENDPOINTS),
			filesystem: parsers.parseBool(process.env.SERVER_LOCATIONS_FILESYSTEM),
		},
		timeouts: {
			keepAlive: parsers.parseNum(process.env.SERVER_TIMEOUTS_KEEPALIVE),
			headers: parsers.parseNum(process.env.SERVER_TIMEOUTS_HEADERS),
			request: parsers.parseNum(process.env.SERVER_TIMEOUTS_REQUEST),
		},
		maxRequestsPerSocket: parsers.parseNum(process.env.SERVER_MAX_REQUESTS),
	},
	filesystem: {
		resolve_extension: parsers.parseBool(process.env.FILESYSTEM_RESOLVE_EXT),
	},
	auth: {
		enable: parsers.parseBool(process.env.AUTH_ENABLE),
		oauth2: {
			realm: parsers.parseString(process.env.AUTH_OAUTH2_REALM),
			issuerUri: parsers.parseString(process.env.AUTH_OAUTH2_ISSUER),
			jwksUri: parsers.parseString(process.env.AUTH_OAUTH2_JWKS),
			audience: parsers.parseString(process.env.AUTH_OAUTH2_AUDIENCE),
		},
	},
	parser: {},
	modifier: {
		enable: parsers.parseBool(process.env.MODIFIER_ENABLE),
		modules: {
			include: parsers.parseBool(process.env.MODIFIER_INCLUDE_ENABLE),
		},
	},
	formatter: {
		default: parsers.parseString(process.env.FORMATTER_DEFAULT),
	},
}

export const config = objects.assignSourceToTemplate(defaults, env) as Config
