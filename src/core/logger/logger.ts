/*
 * Imorts
 */
import pino from 'pino'
import pinoHttp from 'pino-http'
import { config } from '@/core'

const loggerApp = pino({
	enabled: config.logging.app.enable,
	level: config.logging.app.level,
	base: undefined,
	timestamp: pino.stdTimeFunctions.isoTime,
	errorKey: 'error',
	transport: getLoggerTransport(config.logging.app),
})

const loggerHttp = pinoHttp({
	enabled: config.logging.http.enable,
	level: config.logging.http.level,
	base: undefined,
	timestamp: pino.stdTimeFunctions.isoTime,
	genReqId: (request, response) => {
		const header = request.headers['x-request-id'] as string
		const id =
			header && header.length < 64
				? header
				: `${Date.now().toString(36)}.${Math.random().toString(36).slice(2)}`
		response.setHeader('x-request-id', id)
		return id
	},
	customLogLevel(request, response, error) {
		if (error || response.statusCode >= 500) return 'error'
		if (response.statusCode >= 400) return 'warn'
		return 'info'
	},
	transport: getLoggerTransport(config.logging.http),
})

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

export function trace(first: any, second?: any, ...rest: any) {
	loggerApp.trace(first, getLogMessage(first, second), ...rest)
}
export function debug(first: any, second?: any, ...rest: any) {
	loggerApp.debug(first, getLogMessage(first, second), ...rest)
}
export function info(first: any, second?: any, ...rest: any) {
	loggerApp.info(first, getLogMessage(first, second), ...rest)
}
export function warn(first: any, second?: any, ...rest: any) {
	loggerApp.warn(first, getLogMessage(first, second), ...rest)
}
export function error(first: any, second?: any, ...rest: any) {
	loggerApp.error(first, getLogMessage(first, second), ...rest)
}
export function fatal(first: any, second?: any, ...rest: any) {
	loggerApp.fatal(first, getLogMessage(first, second), ...rest)
}
export const http: typeof loggerHttp = loggerHttp.bind(loggerHttp)
