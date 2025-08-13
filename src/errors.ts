/*
 * Imports
 */
import http from 'node:http'

/*
 * Error Definitions
 */
export class HttpError extends Error {
	public status: number | undefined
	public headers: http.OutgoingHttpHeaders | http.OutgoingHttpHeader[] | undefined

	public constructor(
		message: string,
		status?: number,
		headers?: http.OutgoingHttpHeaders | http.OutgoingHttpHeader[],
	) {
		super(message)
		this.name = this.constructor.name
		this.status = status
		this.headers = headers
	}
}
