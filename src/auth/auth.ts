/*
 * Imports
 */
import http from 'node:http'
import * as jose from 'jose'

import * as errors from './errors'
import { config } from '@config'

const _jwks = config.auth.oauth2.jwksUri
	? jose.createRemoteJWKSet(new URL(config.auth.oauth2.jwksUri))
	: undefined

export async function auth(request: http.IncomingMessage): Promise<jose.JWTPayload> {
	// Validate configuration
	if (!config.auth.oauth2.audience || !config.auth.oauth2.issuerUri || !_jwks) {
		throw new errors.AuthConfigurationError()
	}

	// Get token
	const token = getBearerToken(request)
	if (!token) throw new errors.AuthTokenMissingError()

	// Verify token
	try {
		const { payload } = await jose.jwtVerify(token, _jwks, {
			issuer: config.auth.oauth2.issuerUri,
			audience: config.auth.oauth2.audience,
		})
		return payload
	} catch (error: any) {
		if (error instanceof jose.errors.JWTExpired) {
			throw new errors.AuthTokenExpiredError()
		}
		if (error instanceof jose.errors.JWTClaimValidationFailed) {
			throw new errors.AuthClaimValidationError(`Validation of claim "${error.claim}" failed`)
		}
		throw new errors.AuthTokenInvalidError()
	}
}

function getBearerToken(request: http.IncomingMessage): string | undefined {
	const token = request?.headers?.authorization?.split(' ')
	if (token && token[0] === 'Bearer' && token[1]) return token[1]
	return undefined
}
