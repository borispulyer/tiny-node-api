/*
 * Imports
 */
import http from 'node:http'
import * as jose from 'jose'
import * as Errors from './auth.errors'
import type * as Types from './auth.types'

/**
 * Authentication module handling OAuth2/JWT verification.
 */
export class Auth {
	private _ctx
	private _jwks
	private _errors

	/**
	 * Exposes the authentication error types.
	 * @returns Error namespace with specific auth errors.
	 */
	get ['errors']() {
		return this._errors
	}

	/**
	 * Creates a new authentication instance.
	 * @param ctx - Context with configuration and logger.
	 * @param setup - Setup parameters like JWKS.
	 */
	private constructor(ctx: Types.ConstructorCtx, setup: Types.ConstructorSetup) {
		this._ctx = ctx
		this._jwks = setup.jwks
		this._errors = Errors
	}

	/**
	 * Initializes the authentication module from the application context.
	 * @param ctx - Initialization context containing config and logger.
	 * @returns Initialized `Auth` instance ready to verify tokens.
	 * @throws {Errors.AuthConfigurationError} If required configuration is missing.
	 */
	public static async init(ctx: Types.InitCtx): Promise<Auth> {
		// Validate config
		const { issuerUri, jwksUri, audience } = ctx.config.auth.oauth2
		if (!issuerUri || !jwksUri || !audience)
			throw new Errors.AuthConfigurationError(
				`Authentication module configuration error: issuerUri, jwksUri and audience are mandatory.`,
			)
		// Create JWK set to receive public keys
		const jwks = jose.createRemoteJWKSet(new URL(jwksUri))
		// Create constructor parmeters
		return new Auth(
			{
				config: ctx.config.auth.oauth2,
				logger: ctx.logger,
			},
			{ jwks },
		)
	}

	/**
	 * Handle authentication.
	 * Returns only if the authentication was successful, throws an error otherwise.
	 * @param request - Incoming HTTP request.
	 * @returns Payload of the JSON Web Token.
	 * @throws {AuthConfigurationError} Throws if the configuration of the auth module is incomplete.
	 * @throws {AuthTokenMissingError} Throws if the HTTP request does not contain any token.
	 * @throws {AuthTokenExpiredError} Throws if token has expired.
	 * @throws {AuthClaimValidationError} Throws if the validation of the JWT claims failes.
	 * @throws {AuthTokenInvalidError} Throws if the token is invalid for other reasons.
	 */
	public async verify(request: http.IncomingMessage): Promise<jose.JWTPayload> {
		try {
			// Logging
			this._ctx.logger.trace({ request, module: 'auth' }, `Starting authentication....`)

			// Get token
			const token = this._getBearerToken(request)
			this._ctx.logger.trace(
				{ token: token ?? '<empty>', module: 'auth' },
				`Extracted bearer token from header`,
			)
			if (!token) throw new Errors.AuthTokenMissingError()

			// Verify token
			const { payload } = await jose.jwtVerify(token, this._jwks, {
				issuer: this._ctx.config.issuerUri as string,
				audience: this._ctx.config.audience as string,
			})
			this._ctx.logger.trace({ payload, module: 'auth' }, `Authentication successful.`)
			return payload
		} catch (error: any) {
			this._ctx.logger.debug({ error, module: 'auth' })
			if (error instanceof jose.errors.JWTExpired) {
				throw new Errors.AuthTokenExpiredError()
			}
			if (error instanceof jose.errors.JWTClaimValidationFailed) {
				throw new Errors.AuthClaimValidationError(
					`Validation of claim "${error.claim}" failed`,
				)
			}
			if (error instanceof Errors.AuthError) {
				throw error
			}
			throw new Errors.AuthTokenInvalidError()
		}
	}

	/**
	 * Extract bearer token from Authorization header.
	 * @param request - Incoming HTTP request.
	 * @returns Token string if present, otherwise undefined.
	 */
	private _getBearerToken(request: http.IncomingMessage): string | null {
		const bearer = 'bearer '
		const authorization = request?.headers?.authorization
		if (authorization && authorization.slice(0, bearer.length).toLowerCase() === bearer)
			return authorization.slice(bearer.length).trim()
		return null
	}
}
