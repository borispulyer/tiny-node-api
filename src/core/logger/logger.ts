/*
 * Imorts
 */
import pino from 'pino'
import pinoHttp from 'pino-http'
import { config, configTypes } from '@/core'

/*
 * Type Definitions
 */
type LogFnRest = pino.LogFn extends (a: any, b?: any, ...r: infer R) => any ? R : never

const loggerApp = pino({
	enabled: config.logging.app.enable,
	level: getMinLogLevel(config.logging.app.stdout.level, config.logging.app.filesystem.level),
	base: undefined,
	timestamp: pino.stdTimeFunctions.isoTime,
	errorKey: 'error',
	transport: getLoggerTransport(config.logging.app),
})

const loggerHttp = pinoHttp({
	enabled: config.logging.http.enable,
	level: getMinLogLevel(config.logging.http.stdout.level, config.logging.http.filesystem.level),
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
	transport: getLoggerTransport(config.logging.http),
})

/**
 * Determine the lowest log level among provided values.
 * @param levels - Log levels to compare.
 * @returns Lowest severity log level.
 */
function getMinLogLevel(...levels: configTypes.LogLevel[]) {
	let index = Infinity
	const logLevels: configTypes.LogLevel[] = [
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
function getLoggerTransport(conf: (typeof config.logging)[keyof typeof config.logging]) {
	const targets = []
	if (conf.stdout.enable) {
		targets.push({
			target: 'pino-pretty',
			level: conf.stdout.level,
			options: { minimumLevel: undefined, ignore: 'module' },
		})
	}
	if (conf.filesystem.enable && conf.filesystem.file) {
		targets.push({
			target: 'pino-roll',
			level: conf.filesystem.level,
			options: {
				file: conf.filesystem.file,
				size: conf.filesystem.logrotation.size,
				frequency: conf.filesystem.logrotation.frequency,
				extension: conf.filesystem.logrotation.extension,
				symlink: conf.filesystem.logrotation.symlink,
				limit: {
					count: conf.filesystem.logrotation.limit,
				},
				dateFormat: conf.filesystem.logrotation.dateFormat,
				mkdir: true,
				sync: false,
			},
		})
	}
	if (targets.length > 0) return { targets }
	return undefined
}

/**
 * Create a normalized log message from provided arguments.
 * @param first - First argument containing context or error.
 * @param second - Optional message override.
 * @returns Composed log message.
 */
function getLogMessage(first: any, second?: any): any {
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
	} else if (first.hasOwnProperty && first.hasOwnProperty('err') && first.err instanceof Error) {
		msg.push(`[${first.err.name}]`)
		msg.push(second ? second : first.err.message)
	} else {
		msg.push(second)
	}

	return msg.join(' ')
}

/**
 * Log a trace level message.
 * @param first - Context object or error.
 * @param second - Optional message.
 * @param rest - Additional log parameters.
 * @returns Void.
 */
export function trace(first: any, second?: any, ...rest: LogFnRest) {
	loggerApp.trace(first, getLogMessage(first, second), ...rest)
}
/**
 * Log a debug level message.
 * @param first - Context object or error.
 * @param second - Optional message.
 * @param rest - Additional log parameters.
 * @returns Void.
 */
export function debug(first: any, second?: any, ...rest: LogFnRest) {
	loggerApp.debug(first, getLogMessage(first, second), ...rest)
}
/**
 * Log an info level message.
 * @param first - Context object or error.
 * @param second - Optional message.
 * @param rest - Additional log parameters.
 * @returns Void.
 */
export function info(first: any, second?: any, ...rest: LogFnRest) {
	loggerApp.info(first, getLogMessage(first, second), ...rest)
}
/**
 * Log a warning level message.
 * @param first - Context object or error.
 * @param second - Optional message.
 * @param rest - Additional log parameters.
 * @returns Void.
 */
export function warn(first: any, second?: any, ...rest: LogFnRest) {
	loggerApp.warn(first, getLogMessage(first, second), ...rest)
}
/**
 * Log an error level message.
 * @param first - Context object or error.
 * @param second - Optional message.
 * @param rest - Additional log parameters.
 * @returns Void.
 */
export function error(first: any, second?: any, ...rest: LogFnRest) {
	loggerApp.error(first, getLogMessage(first, second), ...rest)
}
/**
 * Log a fatal level message.
 * @param first - Context object or error.
 * @param second - Optional message.
 * @param rest - Additional log parameters.
 * @returns Void.
 */
export function fatal(first: any, second?: any, ...rest: LogFnRest) {
	loggerApp.fatal(first, getLogMessage(first, second), ...rest)
}
export const http: typeof loggerHttp = loggerHttp.bind(loggerHttp)
