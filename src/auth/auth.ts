/*
 * Imports
 */
import http from 'node:http'
import * as jose from 'jose'
import * as errors from './errors'
import { config, logger } from '@/core'

/*
 * Definitions
 */
const { issuerUri, jwksUri, audience } = config.auth.oauth2

const _jwks = jwksUri ? jose.createRemoteJWKSet(new URL(jwksUri)) : undefined

export async function auth(request: http.IncomingMessage): Promise<jose.JWTPayload> {
	try {
		// Logging
		logger.trace({ request, module: 'auth' }, `Starting authentication....`)

		// Validate configuration
		if (!audience || !issuerUri || !_jwks) {
			throw new errors.AuthConfigurationError(
				`Authentication module configuration error: issuerUri, jwksUri and audience are mandatory.`,
			)
		}

		// Get token
		const token = getBearerToken(request)
		logger.trace(
			{ token: token ?? '<empty>', module: 'auth' },
			`Extracted bearer token from header`,
		)
		if (!token) throw new errors.AuthTokenMissingError()

		// Verify token
		const { payload } = await jose.jwtVerify(token, _jwks, {
			issuer: issuerUri,
			audience: audience,
		})
		logger.trace({ payload, module: 'auth' }, `Authentication successful.`)
		return payload
	} catch (error: any) {
		logger.debug({ error, module: 'auth' })
		if (error instanceof jose.errors.JWTExpired) {
			throw new errors.AuthTokenExpiredError()
		}
		if (error instanceof jose.errors.JWTClaimValidationFailed) {
			throw new errors.AuthClaimValidationError(`Validation of claim "${error.claim}" failed`)
		}
		if (error instanceof errors.AuthError) {
			throw error
		}
		throw new errors.AuthTokenInvalidError()
	}
}

/**
 * Extract bearer token from Authorization header.
 * @param request - Incoming HTTP request.
 * @returns Token string if present.
 */
function getBearerToken(request: http.IncomingMessage): string | undefined {
	const token = request?.headers?.authorization?.split(' ')
	if (token && token[0] === 'Bearer' && token[1]) return token[1]
	return undefined
}
