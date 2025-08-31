/*
 * Imports
 */
import http from 'node:http'

/**
 * Generic HTTP error containing status and headers for response handling.
 */
export class HttpError extends Error {
	public status: number | undefined
	public headers: http.OutgoingHttpHeaders | http.OutgoingHttpHeader[] | undefined

	public constructor(
		message?: string,
		status?: number,
		headers?: http.OutgoingHttpHeaders | http.OutgoingHttpHeader[],
	) {
		super(message)
		this.name = this.constructor.name
		this.status = status
		this.headers = headers
	}
}

/**
 * Specialized HTTP error used to indicate a 304 Not Modified response.
 */
export class HttpNotModifiedError extends HttpError {
	public constructor(headers?: http.OutgoingHttpHeaders | http.OutgoingHttpHeader[]) {
		super()
		this.name = this.constructor.name
		this.headers = headers
	}
}

/**
 * Server configuration error with optional config snapshot for diagnostics.
 */
export class ConfigurationError extends Error {
	public config: any

	public constructor(message?: string, config?: any) {
		super(message)
		this.name = this.constructor.name
		this.config = config
	}
}
