/*
 * Imports
 */
import path from 'node:path'
import { configDefaults, configTypes, parsers, objects, types } from '@/core'

/**
 * Assign environment variables to config and merge with defaults
 */
const env: types.DeepPartial<configTypes.Config> = {
	server: {
		port: parsers.parsePort(process.env.SERVER_PORT),
		path: {
			public: parsers.parseString(process.env.SERVER_PATH_PUBLIC)
				? path.resolve(
						import.meta.dirname,
						'..',
						parsers.parseString(process.env.SERVER_PATH_PUBLIC) as string,
					)
				: undefined,
			filter: parsers.parseString(process.env.SERVER_PATH_FILTER)
				? path.resolve(
						import.meta.dirname,
						'..',
						parsers.parseString(process.env.SERVER_PATH_FILTER) as string,
					)
				: undefined,
		},
		locations: {
			heartbeat: parsers.parseBool(process.env.SERVER_LOCATIONS_HEARTBEAT),
			endpoints: parsers.parseBool(process.env.SERVER_LOCATIONS_ENDPOINTS),
			filesystem: parsers.parseBool(process.env.SERVER_LOCATIONS_FILESYSTEM),
		},
		timeouts: {
			socket: parsers.parseNum(process.env.SERVER_TIMEOUTS_SOCKET),
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
	logging: {
		http: {
			enable: parsers.parseBool(process.env.LOGGING_HTTP_ENABLE),
			stdout: {
				enable: parsers.parseBool(process.env.LOGGING_HTTP_STDOUT_ENABLE),
				level: parsers.parseLogLevel(process.env.LOGGING_HTTP_STDOUT_LEVEL),
			},
			filesystem: {
				enable: parsers.parseBool(process.env.LOGGING_HTTP_FILE_ENABLE),
				file: parsers.parseString(process.env.LOGGING_HTTP_FILE),
				level: parsers.parseLogLevel(process.env.LOGGING_HTTP_FILE_LEVEL),
				logrotation: {
					size: parsers.parseString(process.env.LOGGING_HTTP_LOGROTATION_SIZE),
					frequency: parsers.parseString(process.env.LOGGING_HTTP_LOGROTATION_FREQUENCY),
					limit: parsers.parseNum(process.env.LOGGING_HTTP_LOGROTATION_LIMIT),
					extension: parsers.parseString(process.env.LOGGING_HTTP_LOGROTATION_EXTENSION),
					dateFormat: parsers.parseString(
						process.env.LOGGING_HTTP_LOGROTATION_DATEFORMAT,
					),
					symlink: parsers.parseBool(process.env.LOGGING_HTTP_LOGROTATION_SYMLINK),
				},
			},
		},
		app: {
			enable: parsers.parseBool(process.env.LOGGING_APP_ENABLE),
			stdout: {
				enable: parsers.parseBool(process.env.LOGGING_APP_STDOUT_ENABLE),
				level: parsers.parseLogLevel(process.env.LOGGING_APP_STDOUT_LEVEL),
			},
			filesystem: {
				enable: parsers.parseBool(process.env.LOGGING_APP_FILE_ENABLE),
				file: parsers.parseString(process.env.LOGGING_APP_FILE),
				level: parsers.parseLogLevel(process.env.LOGGING_APP_FILE_LEVEL),
				logrotation: {
					size: parsers.parseString(process.env.LOGGING_APP_LOGROTATION_SIZE),
					frequency: parsers.parseString(process.env.LOGGING_APP_LOGROTATION_FREQUENCY),
					limit: parsers.parseNum(process.env.LOGGING_APP_LOGROTATION_LIMIT),
					extension: parsers.parseString(process.env.LOGGING_APP_LOGROTATION_EXTENSION),
					dateFormat: parsers.parseString(process.env.LOGGING_APP_LOGROTATION_DATEFORMAT),
					symlink: parsers.parseBool(process.env.LOGGING_APP_LOGROTATION_SYMLINK),
				},
			},
		},
	},
}

export const config = objects.assignSourceToTemplate(configDefaults, env) as configTypes.Config
