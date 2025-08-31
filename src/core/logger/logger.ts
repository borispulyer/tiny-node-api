/*
 * Imports
 */
import pino from 'pino'
import pinoHttp from 'pino-http'
import type * as Types from './logger.types'

/**
 * Application and HTTP logging facade built on top of pino.
 */
export class Logger {
	private _loggerApp
	private _loggerHttp

	/**
	 * Create a new logger instance.
	 * @param ctx - Constructor context.
	 * @param setup - Setup including app and http loggers.
	 */
	private constructor(ctx: Types.ConstructorCtx, setup: Types.ConstructorSetup) {
		this._loggerApp = setup.loggerApp
		this._loggerHttp = setup.loggerHttp
	}

	/**
	 * Initialize app and HTTP loggers based on configuration.
	 * @param ctx - Initialization context providing configuration.
	 * @returns Initialized `Logger` instance.
	 */
	public static async init(ctx: Types.InitCtx): Promise<Logger> {
		const loggerApp = await Logger._createAppLogger(ctx.config.logging.app)
		const loggerHttp = await Logger._createHttpLogger(ctx.config.logging.http)
		return new Logger({}, { loggerApp, loggerHttp })
	}

	/**
	 * Log a trace level message.
	 * @param first - Context object or error.
	 * @param second - Optional message.
	 * @param rest - Additional log parameters.
	 * @returns Void.
	 */
	public trace(first: any, second?: any, ...rest: Types.LogFnRest) {
		this._loggerApp.trace(first, this._getLogMessage(first, second), ...rest)
	}

	/**
	 * Log a debug level message.
	 * @param first - Context object or error.
	 * @param second - Optional message.
	 * @param rest - Additional log parameters.
	 * @returns Void.
	 */
	public debug(first: any, second?: any, ...rest: Types.LogFnRest) {
		this._loggerApp.debug(first, this._getLogMessage(first, second), ...rest)
	}

	/**
	 * Log an info level message.
	 * @param first - Context object or error.
	 * @param second - Optional message.
	 * @param rest - Additional log parameters.
	 * @returns Void.
	 */
	public info(first: any, second?: any, ...rest: Types.LogFnRest) {
		this._loggerApp.info(first, this._getLogMessage(first, second), ...rest)
	}

	/**
	 * Log a warning level message.
	 * @param first - Context object or error.
	 * @param second - Optional message.
	 * @param rest - Additional log parameters.
	 * @returns Void.
	 */
	public warn(first: any, second?: any, ...rest: Types.LogFnRest) {
		this._loggerApp.warn(first, this._getLogMessage(first, second), ...rest)
	}

	/**
	 * Log an error level message.
	 * @param first - Context object or error.
	 * @param second - Optional message.
	 * @param rest - Additional log parameters.
	 * @returns Void.
	 */
	public error(first: any, second?: any, ...rest: Types.LogFnRest) {
		this._loggerApp.error(first, this._getLogMessage(first, second), ...rest)
	}

	/**
	 * Log a fatal level message.
	 * @param first - Context object or error.
	 * @param second - Optional message.
	 * @param rest - Additional log parameters.
	 * @returns Void.
	 */
	public fatal(first: any, second?: any, ...rest: Types.LogFnRest) {
		this._loggerApp.fatal(first, this._getLogMessage(first, second), ...rest)
	}

	/**
	 * Log a HTTP message.
	 * @param first - Context object or error.
	 * @param second - Optional message.
	 * @param rest - Additional log parameters.
	 * @returns Void.
	 */
	public http(first: any, second: any) {
		this._loggerHttp(first, second)
	}

	/**
	 * Create a normalized log message from provided arguments.
	 * @param first - First argument containing context or error.
	 * @param second - Optional message override.
	 * @returns Composed log message.
	 */
	private _getLogMessage(first: any, second?: any): any {
		const msg = []
		if (first.hasOwnProperty && first.hasOwnProperty('module')) {
			msg.push(`[${first.module}]`)
		}
		if (first instanceof Error) {
			msg.push(`[${first.name}]`)
			msg.push(second ? second : first.message)
		} else if (
			first.hasOwnProperty &&
			first.hasOwnProperty('error') &&
			first.error instanceof Error
		) {
			msg.push(`[${first.error.name}]`)
			msg.push(second ? second : first.error.message)
		} else if (
			first.hasOwnProperty &&
			first.hasOwnProperty('err') &&
			first.err instanceof Error
		) {
			msg.push(`[${first.err.name}]`)
			msg.push(second ? second : first.err.message)
		} else {
			msg.push(second)
		}

		return msg.join(' ')
	}

	/**
	 * Create the pino logger for application logs.
	 * @param config - Application logging configuration.
	 * @returns Configured pino logger instance.
	 */
	private static async _createAppLogger(
		config: Types.InitCtxConfigLogging['app'],
	): Promise<pino.Logger> {
		return pino({
			enabled: config.enable,
			level: Logger._getMinLogLevel(config.stdout.level, config.filesystem.level),
			base: undefined,
			timestamp: pino.stdTimeFunctions.isoTime,
			errorKey: 'error',
			transport: Logger._getLoggerTransport(config),
		})
	}

	/**
	 * Create the HTTP logger middleware based on configuration.
	 * @param config - HTTP logging configuration.
	 * @returns pino-http middleware function.
	 */
	private static async _createHttpLogger(
		config: Types.InitCtxConfigLogging['http'],
	): Promise<any> {
		return pinoHttp({
			enabled: config.enable,
			level: Logger._getMinLogLevel(config.stdout.level, config.filesystem.level),
			base: undefined,
			redact: { paths: ['request.headers.authorization'] },
			timestamp: pino.stdTimeFunctions.isoTime,
			/**
			 * Generate a unique request identifier.
			 * @param request - Incoming HTTP request.
			 * @param response - Server response object.
			 * @returns Generated request ID.
			 */
			genReqId: (request, response) => {
				const header = request.headers['x-request-id'] as string
				const id =
					header && header.length < 64
						? header
						: `${Date.now().toString(36)}.${Math.random().toString(36).slice(2)}`
				response.setHeader('x-request-id', id)
				return id
			},
			/**
			 * Determine log level for the current HTTP response.
			 * @param request - Incoming HTTP request.
			 * @param response - Server response object.
			 * @param error - Optional error encountered while handling request.
			 * @returns Log level string.
			 */
			customLogLevel(request, response, error) {
				if (error || response.statusCode >= 500) return 'error'
				if (response.statusCode >= 400) return 'warn'
				return 'info'
			},
			/**
			 * Append custom properties to log entries.
			 * @param request - Incoming HTTP request.
			 * @param response - Server response object.
			 * @returns Object merged into log context.
			 */
			customProps(request, response) {
				return {
					user: (request as any).user,
				}
			},
			customAttributeKeys: {
				req: 'request',
				res: 'response',
				err: 'error',
			},
			transport: Logger._getLoggerTransport(config),
		})
	}

	/**
	 * Determine the lowest log level among provided values.
	 * @param levels - Log levels to compare.
	 * @returns Lowest severity log level.
	 */
	private static _getMinLogLevel(...levels: Types.LogLevel[]): pino.LevelWithSilent {
		let index = Infinity
		const logLevels: Types.LogLevel[] = [
			'trace',
			'debug',
			'info',
			'warn',
			'error',
			'fatal',
			'silent',
		]
		for (const level of levels) {
			index = Math.min(logLevels.indexOf(level), index)
		}
		return logLevels[index]
	}

	/**
	 * Build transport configuration for pino based on settings.
	 * @param conf - Logger configuration section.
	 * @returns Transport configuration or undefined.
	 */
	private static _getLoggerTransport(
		config: Types.InitCtxConfigLogging[keyof Types.InitCtxConfigLogging],
	): pino.TransportMultiOptions | undefined {
		const targets = []
		if (config.stdout.enable) {
			targets.push({
				target: 'pino-pretty',
				level: config.stdout.level,
				options: { minimumLevel: undefined, ignore: 'module' },
			})
		}
		if (config.filesystem.enable && config.filesystem.file) {
			targets.push({
				target: 'pino-roll',
				level: config.filesystem.level,
				options: {
					file: config.filesystem.file,
					size: config.filesystem.logrotation.size,
					frequency: config.filesystem.logrotation.frequency,
					extension: config.filesystem.logrotation.extension,
					symlink: config.filesystem.logrotation.symlink,
					limit: {
						count: config.filesystem.logrotation.limit,
					},
					dateFormat: config.filesystem.logrotation.dateFormat,
					mkdir: true,
					sync: false,
				},
			})
		}
		if (targets.length > 0) return { targets }
		return undefined
	}
}
