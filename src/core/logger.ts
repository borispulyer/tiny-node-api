import path from 'node:path'

export enum LoggingLevel {
	Error,
	Warn,
	Info,
	Debug,
}

const _logging_level = LoggingLevel.Debug

function _getLocation(): string {
	function _getFilenameAndPosition(trace: string | undefined): string {
		return trace ? trace.slice(trace.lastIndexOf('/') + 1, trace.lastIndexOf(')')) : ''
	}

	function _getFilename(trace: string | undefined): string {
		trace = _getFilenameAndPosition(trace)
		return trace.slice(0, trace.indexOf(':'))
	}

	function _getPosition(trace: string | undefined): string {
		trace = _getFilenameAndPosition(trace)
		return trace.slice(trace.indexOf(':') + 1)
	}

	const myError = new Error()
	const trace = myError.stack?.split('\n').slice(1)
	const current_file = _getFilename(trace?.[1])
	return _getFilenameAndPosition(trace?.find((element) => _getFilename(element) !== current_file))
}

export function debug(message: string, ...args: unknown[]): void {
	log(LoggingLevel.Debug, message, ...args)
}

export function info(message: string, ...args: unknown[]): void {
	log(LoggingLevel.Info, message, ...args)
}

export function warn(message: string, ...args: unknown[]): void {
	log(LoggingLevel.Warn, message, ...args)
}

export function error(message: string, ...args: unknown[]): void {
	log(LoggingLevel.Error, message, ...args)
}

export function log(level: LoggingLevel, message: string, ...args: unknown[]): void {
	if (level > _logging_level) return
	switch (level) {
		case LoggingLevel.Error:
			console.error(`[ ERR  ] [${_getLocation()}]\t${message} `, ...args)
			break
		case LoggingLevel.Warn:
			console.warn(`[ WARN ] [${_getLocation()}]\t${message} `, ...args)
			break
		case LoggingLevel.Info:
			console.info(`[ INFO ] [${_getLocation()}]\t${message} `, ...args)
			break
		case LoggingLevel.Debug:
			console.log(`[ DEBG ] [${_getLocation()}]\t${message} `, ...args)
			break
	}
}
