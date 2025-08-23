/*
 * Imports
 */
import path from 'node:path'
import * as errors from '@/errors'
import { configDefaults, configTypes, parsers, objects, types, files } from '@/core'
import { auth } from '@/auth'
import { endpoints } from '@/server/modules'
import { isFormatterRegistered } from '@/formatter'
import { isModifierRegistered } from '@/modifier'
import { isParserRegistered } from '@/parser'

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
	endpoints: parsers.parseJson2Array(process.env.ENDPOINTS),
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

export async function checkConfig(_config: configTypes.Config = config): Promise<void> {
	// config.server.path
	for (const key of Object.keys(_config.server.path) as Array<keyof typeof _config.server.path>) {
		if (!path.isAbsolute(_config.server.path[key])) {
			throw new errors.ConfigurationError(
				`Directory of config.server.path.${key} ("${_config.server.path[key]}") mst be absolute.`,
				_config.server,
			)
		}

		if (!(await files.isDirectoryExisting(_config.server.path[key]))) {
			throw new errors.ConfigurationError(
				`Directory of config.server.path.${key} ("${_config.server.path[key]}") does not exist.`,
				_config.server,
			)
		}
	}

	// config.endpoints
	for (const endpoint of _config.endpoints) {
		if (!endpoint.enable) continue
		const file = path.resolve(_config.server.path.public, endpoint.file)
		if (!(await files.isFileExisting(file))) {
			throw new errors.ConfigurationError(
				`Endpoint configuration error: Endpoint file "${path.resolve(_config.server.path.public, endpoint.file)}" does not exist.`,
				endpoint,
			)
		}
		if (!isParserRegistered(file)) {
			throw new errors.ConfigurationError(
				`Endpoint configuration error: Parser for endpoint file "${endpoint.file}" is not available.`,
				endpoint,
			)
		}
		if (endpoint.format && !isFormatterRegistered(endpoint.format)) {
			throw new errors.ConfigurationError(
				`Endpoint configuration error: Formatter for "${endpoint.format}" is not available.`,
				endpoint,
			)
		}
		if (
			endpoint.filter &&
			!(await files.isFileWithinRoot(
				path.resolve(_config.server.path.filter, endpoint.filter),
				'filter',
			))
		) {
			throw new errors.ConfigurationError(
				`Endpoint configuration error: Filter file "${path.resolve(_config.server.path.filter, endpoint.filter)}" is not within filter folder ("${config.server.path.filter}").`,
				endpoint,
			)
		}
		if (
			endpoint.filter &&
			!(await files.isFileExisting(path.resolve(_config.server.path.filter, endpoint.filter)))
		) {
			throw new errors.ConfigurationError(
				`Endpoint configuration error: Filter file "${path.resolve(_config.server.path.filter, endpoint.filter)}" does not exist.`,
				endpoint,
			)
		}
	}

	// config.auth
	if (
		_config.auth.enable &&
		(!_config.auth.oauth2.issuerUri ||
			!_config.auth.oauth2.jwksUri ||
			!_config.auth.oauth2.audience)
	) {
		throw new errors.ConfigurationError(
			`Auth module configuration error: config.auth.oauth2.issuerUri, config.auth.oauth2.jwksUri and config.auth.oauth2.audience are mandatory.`,
			_config.auth,
		)
	}

	// config.modifier
	for (const key of Object.keys(_config.modifier.modules) as Array<
		keyof typeof _config.modifier.modules
	>) {
		if (!isModifierRegistered(key)) {
			throw new errors.ConfigurationError(
				`Modifier configuration error: Modifier "${key}" is not available.`,
				_config.modifier,
			)
		}
	}

	// config.formatter
	if (_config.formatter.default && !isFormatterRegistered(_config.formatter.default)) {
		throw new errors.ConfigurationError(
			`Formatter configuration error: Default formatter "${_config.formatter.default}" is not available.`,
			_config.formatter,
		)
	}
}
