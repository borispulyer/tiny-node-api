/*
 * Imports
 */
import path from 'node:path'
import { Config } from '@config/config.types'
import { defaults } from '@config/config.defaults'
import { parsers, objects, types } from '@utils/index'

/**
 * Assign environment varibales to config and merge with defaults
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
			files: parsers.parseBool(process.env.SERVER_LOCATIONS_FILES),
		},
	},
	files: {
		resolve_extension: parsers.parseBool(process.env.FILES_RESOLVE_EXT),
	},
	auth: {
		enable: parsers.parseBool(process.env.AUTH_ENABLE),
		oauth2: {
			realm: parsers.parseString(process.env.AUTH_OAUTH2_REALM),
			issuer_uri: parsers.parseString(process.env.AUTH_OAUTH2_ISSUER),
			jwks_uri: parsers.parseString(process.env.AUTH_OAUTH2_JWKS),
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
