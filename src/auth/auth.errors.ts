/*
 * Type Definitions
 */
type Header = {
	status?: number
	realm?: string | null
	error?: 'invalid_request' | 'invalid_token' | 'insufficient_scope'
	error_description?: string
}

/**
 * Base error for authentication failures, carrying OAuth2 Bearer header data.
 */
export class AuthError extends Error {
	public header: Header = {}

	public constructor(message?: string) {
		super(message)
		this.name = this.constructor.name
		this.header.status = 401
		this.header.realm = 'API'
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

/**
 * Thrown when the authentication module is misconfigured.
 */
export class AuthConfigurationError extends AuthError {
	public constructor(message?: string) {
		super(message)
		this.name = this.constructor.name
		this.header.status = 500
		if (!message) this.message = 'Authentication module is not properly configured'
	}
}

/**
 * Thrown when the Authorization header with a bearer token is missing.
 */
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

/**
 * Thrown when the provided token has expired.
 */
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

/**
 * Thrown when the provided token is invalid for any other reason.
 */
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

/**
 * Thrown when a JWT claim fails validation.
 */
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
