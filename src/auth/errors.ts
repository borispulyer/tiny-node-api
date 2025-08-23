/*
 * Imports
 */
import { config } from '@/core'

/*
 * Type Definitions
 */
type Header = {
	status?: number
	realm?: string | null
	error?: 'invalid_request' | 'invalid_token' | 'insufficient_scope'
	error_description?: string
}

/*
 * Error Definitions
 */
export class AuthError extends Error {
	public header: Header = {}

	public constructor(message?: string) {
		super(message)
		this.name = this.constructor.name
		this.header.status = 401
		this.header.realm = config.auth.oauth2.realm
		this.header.error = 'invalid_token'
		this.header.error_description = undefined
	}

	/**
	 * Build the WWW-Authenticate header value based on error details.
	 * @returns Constructed header string or undefined.
	 */
	public getWWWAuthenticateHeader(): string | undefined {
		const parts = [
			this.header.realm && `realm="${this.header.realm}"`,
			this.header.error && `error="${this.header.error}"`,
			this.header.error_description && `error_description="${this.header.error_description}"`,
		].filter((x): x is string => Boolean(x))
		return parts.length ? `Bearer ${parts.join(', ')}` : undefined
	}
}

export class AuthConfigurationError extends AuthError {
	public constructor(message?: string) {
		super(message)
		this.name = this.constructor.name
		this.header.status = 500
		if (!message) this.message = 'Authentication module is not properly configured'
	}
}

export class AuthTokenMissingError extends AuthError {
	public constructor(message?: string) {
		super(message)
		this.name = this.constructor.name
		this.header.status = 401
		this.header.error = 'invalid_token'
		this.header.error_description = 'Authentication header with bearer token is missing'
		if (!message) this.message = this.header.error_description
	}
}

export class AuthTokenExpiredError extends AuthError {
	public constructor(message?: string) {
		super(message)
		this.name = this.constructor.name
		this.header.status = 401
		this.header.error = 'invalid_token'
		this.header.error_description = 'Token has expired'
		if (!message) this.message = this.header.error_description
	}
}

export class AuthTokenInvalidError extends AuthError {
	public constructor(message?: string) {
		super(message)
		this.name = this.constructor.name
		this.header.status = 401
		this.header.error = 'invalid_token'
		this.header.error_description = 'Token is invalid'
		if (!message) this.message = this.header.error_description
	}
}

export class AuthClaimValidationError extends AuthError {
	public constructor(message?: string) {
		super(message)
		this.name = this.constructor.name
		this.header.status = 401
		this.header.error = 'invalid_token'
		this.header.error_description = 'Claim validation failed'
		if (!message) this.message = this.header.error_description
	}
}
