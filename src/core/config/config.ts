/*
 * Imports
 */
import 'dotenv/config'
import path from 'node:path'
import { configDefaults } from './config.defaults'
import * as Errors from './config.errors'
import type * as Types from './config.types'
import { parsers, objects, files } from '@/core'
import type { BootstrapTypes } from '@/core'

const app_root: string = path.resolve(import.meta.dirname, '../../../')

/**
 * Configuration service that loads, merges and validates application settings.
 */
export class Config {
	private _config
	private _errors

	get ['server']() {
		return this._config.server
	}
	get ['filesystem']() {
		return this._config.filesystem
	}
	get ['endpoints']() {
		return this._config.endpoints
	}
	get ['auth']() {
		return this._config.auth
	}
	get ['parser']() {
		return this._config.parser
	}
	get ['modifier']() {
		return this._config.modifier
	}
	get ['formatter']() {
		return this._config.formatter
	}
	get ['logging']() {
		return this._config.logging
	}
	get ['errors']() {
		return this._errors
	}

	/**
	 * Creates a new configuration instance.
	 * @param ctx - Constructor context (reserved for DI).
	 * @param setup - Setup containing the resolved config object.
	 */
	private constructor(ctx: Types.ConstructorCtx, setup: Types.ConstructorSetup) {
		this._config = setup.config
		this._errors = Errors
	}

	/**
	 * Initializes configuration by loading environment and file values and
	 * merging them with defaults, then validating the final result.
	 * @returns Initialized `Config` instance.
	 * @throws {Errors.ConfigValidationError} If validation fails.
	 */
	public static async init(): Promise<Config> {
		const configEnv = await Config._loadConfigFromEnv(process.env)
		const configFile = await Config._loadConfigFromFile('')
		const config = objects.assignSourcesToTemplate(
			configDefaults,
			configEnv,
			configFile,
		) as Types.Config
		await Config.validateConfig(config)
		return new Config({}, { config })
	}

	/**
	 * Validates a configuration object against required invariants and
	 * availability of referenced resources.
	 * @param config - Configuration to validate.
	 * @param ctx - Optional application context to validate dynamic dependencies.
	 * @throws {Errors.ConfigValidationError} If any validation rule fails.
	 */
	public static async validateConfig(
		config: Types.Config,
		ctx?: BootstrapTypes.AppContext,
	): Promise<void> {
		// config.server.path
		for (const key of Object.keys(config.server.path) as Array<
			keyof typeof config.server.path
		>) {
			if (!path.isAbsolute(config.server.path[key])) {
				throw new Errors.ConfigValidationError(
					`Directory of config.server.path.${key} ("${config.server.path[key]}") must be absolute.`,
					config.server,
				)
			}

			if (!(await files.isDirectoryExisting(config.server.path[key]))) {
				throw new Errors.ConfigValidationError(
					`Directory of config.server.path.${key} ("${config.server.path[key]}") does not exist.`,
					config.server,
				)
			}
		}

		// config.endpoints
		for (const endpoint of config.endpoints) {
			if (!endpoint.enable) continue
			const file = path.resolve(config.server.path.public, endpoint.file)
			if (!(await files.isFileExisting(file))) {
				throw new Errors.ConfigValidationError(
					`Endpoint configuration error: Endpoint file "${path.resolve(config.server.path.public, endpoint.file)}" does not exist.`,
					endpoint,
				)
			}
			if (ctx?.parser && !ctx.parser.isParserRegistered(file)) {
				throw new Errors.ConfigValidationError(
					`Endpoint configuration error: Parser for endpoint file "${endpoint.file}" is not available.`,
					endpoint,
				)
			}
			if (
				ctx?.formatter &&
				endpoint.format &&
				!ctx.formatter.isFormatterRegistered(endpoint.format)
			) {
				throw new Errors.ConfigValidationError(
					`Endpoint configuration error: Formatter for "${endpoint.format}" is not available.`,
					endpoint,
				)
			}
			if (
				endpoint.filter &&
				!(await files.isFileWithinRoot(
					path.resolve(config.server.path.filter, endpoint.filter),
					config.server.path.filter,
				))
			) {
				throw new Errors.ConfigValidationError(
					`Endpoint configuration error: Filter file "${path.resolve(config.server.path.filter, endpoint.filter)}" is not within filter folder ("${config.server.path.filter}").`,
					endpoint,
				)
			}
			if (
				endpoint.filter &&
				!(await files.isFileExisting(
					path.resolve(config.server.path.filter, endpoint.filter),
				))
			) {
				throw new Errors.ConfigValidationError(
					`Endpoint configuration error: Filter file "${path.resolve(config.server.path.filter, endpoint.filter)}" does not exist.`,
					endpoint,
				)
			}
		}

		// config.auth
		if (
			config.auth.enable &&
			(!config.auth.oauth2.issuerUri ||
				!config.auth.oauth2.jwksUri ||
				!config.auth.oauth2.audience)
		) {
			throw new Errors.ConfigValidationError(
				`Auth module configuration error: config.auth.oauth2.issuerUri, config.auth.oauth2.jwksUri and config.auth.oauth2.audience are mandatory.`,
				config.auth,
			)
		}

		// config.modifier
		for (const key of Object.keys(config.modifier.modules) as Array<
			keyof typeof config.modifier.modules
		>) {
			if (ctx?.modifier && !ctx.modifier.isModifierRegistered(key)) {
				throw new Errors.ConfigValidationError(
					`Modifier configuration error: Modifier "${key}" is not available.`,
					config.modifier,
				)
			}
		}

		// config.formatter
		if (
			ctx?.formatter &&
			config.formatter.default &&
			!ctx.formatter.isFormatterRegistered(config.formatter.default)
		) {
			throw new Errors.ConfigValidationError(
				`Formatter configuration error: Default formatter "${config.formatter.default}" is not available.`,
				config.formatter,
			)
		}
	}

	/**
	 * Loads partial configuration from environment variables.
	 * @param env - Source environment object (typically `process.env`).
	 * @returns Partial configuration derived from environment variables.
	 */
	private static async _loadConfigFromEnv(env: any): Promise<Types.ConfigPartial> {
		return {
			server: {
				port: parsers.parsePort(env.SERVER_PORT),
				path: {
					public: parsers.parseString(env.SERVER_PATH_PUBLIC)
						? path.resolve(
								app_root,
								parsers.parseString(env.SERVER_PATH_PUBLIC) as string,
							)
						: undefined,
					filter: parsers.parseString(env.SERVER_PATH_FILTER)
						? path.resolve(
								app_root,
								parsers.parseString(env.SERVER_PATH_FILTER) as string,
							)
						: undefined,
				},
				locations: {
					heartbeat: parsers.parseBool(env.SERVER_LOCATIONS_HEARTBEAT),
					endpoints: parsers.parseBool(env.SERVER_LOCATIONS_ENDPOINTS),
					filesystem: parsers.parseBool(env.SERVER_LOCATIONS_FILESYSTEM),
				},
				cache: {
					cacheControlHeader: parsers.parseString(env.SERVER_CACHE_HEADER),
					cacheControlHeaderAuth: parsers.parseString(env.SERVER_CACHE_HEADER_AUTH),
				},
				timeouts: {
					socket: parsers.parseNum(env.SERVER_TIMEOUTS_SOCKET),
					keepAlive: parsers.parseNum(env.SERVER_TIMEOUTS_KEEPALIVE),
					headers: parsers.parseNum(env.SERVER_TIMEOUTS_HEADERS),
					request: parsers.parseNum(env.SERVER_TIMEOUTS_REQUEST),
				},
				maxRequestsPerSocket: parsers.parseNum(env.SERVER_MAX_REQUESTS),
			},
			filesystem: {
				resolve_extension: parsers.parseBool(env.FILESYSTEM_RESOLVE_EXT),
			},
			endpoints: parsers.parseJson2Array(env.ENDPOINTS),
			auth: {
				enable: parsers.parseBool(env.AUTH_ENABLE),
				oauth2: {
					issuerUri: parsers.parseString(env.AUTH_OAUTH2_ISSUER),
					jwksUri: parsers.parseString(env.AUTH_OAUTH2_JWKS),
					audience: parsers.parseString(env.AUTH_OAUTH2_AUDIENCE),
				},
			},
			parser: {},
			modifier: {
				enable: parsers.parseBool(env.MODIFIER_ENABLE),
				modules: {
					include: parsers.parseBool(env.MODIFIER_INCLUDE_ENABLE),
				},
			},
			formatter: {
				default: parsers.parseString(env.FORMATTER_DEFAULT),
			},
			logging: {
				http: {
					enable: parsers.parseBool(env.LOGGING_HTTP_ENABLE),
					stdout: {
						enable: parsers.parseBool(env.LOGGING_HTTP_STDOUT_ENABLE),
						level: parsers.parseLogLevel(env.LOGGING_HTTP_STDOUT_LEVEL),
					},
					filesystem: {
						enable: parsers.parseBool(env.LOGGING_HTTP_FILE_ENABLE),
						file: parsers.parseString(env.LOGGING_HTTP_FILE),
						level: parsers.parseLogLevel(env.LOGGING_HTTP_FILE_LEVEL),
						logrotation: {
							size: parsers.parseString(env.LOGGING_HTTP_LOGROTATION_SIZE),
							frequency: parsers.parseString(env.LOGGING_HTTP_LOGROTATION_FREQUENCY),
							limit: parsers.parseNum(env.LOGGING_HTTP_LOGROTATION_LIMIT),
							extension: parsers.parseString(env.LOGGING_HTTP_LOGROTATION_EXTENSION),
							dateFormat: parsers.parseString(
								env.LOGGING_HTTP_LOGROTATION_DATEFORMAT,
							),
							symlink: parsers.parseBool(env.LOGGING_HTTP_LOGROTATION_SYMLINK),
						},
					},
				},
				app: {
					enable: parsers.parseBool(env.LOGGING_APP_ENABLE),
					stdout: {
						enable: parsers.parseBool(env.LOGGING_APP_STDOUT_ENABLE),
						level: parsers.parseLogLevel(env.LOGGING_APP_STDOUT_LEVEL),
					},
					filesystem: {
						enable: parsers.parseBool(env.LOGGING_APP_FILE_ENABLE),
						file: parsers.parseString(env.LOGGING_APP_FILE),
						level: parsers.parseLogLevel(env.LOGGING_APP_FILE_LEVEL),
						logrotation: {
							size: parsers.parseString(env.LOGGING_APP_LOGROTATION_SIZE),
							frequency: parsers.parseString(env.LOGGING_APP_LOGROTATION_FREQUENCY),
							limit: parsers.parseNum(env.LOGGING_APP_LOGROTATION_LIMIT),
							extension: parsers.parseString(env.LOGGING_APP_LOGROTATION_EXTENSION),
							dateFormat: parsers.parseString(env.LOGGING_APP_LOGROTATION_DATEFORMAT),
							symlink: parsers.parseBool(env.LOGGING_APP_LOGROTATION_SYMLINK),
						},
					},
				},
			},
		}
	}

	/**
	 * Loads additional configuration from a config file.
	 * Currently a placeholder for future file-based config.
	 * @param file - Path to the config file.
	 * @returns Partial configuration from file (if any).
	 */
	private static async _loadConfigFromFile(file: string): Promise<Types.ConfigPartial> {
		return {}
	}
}
