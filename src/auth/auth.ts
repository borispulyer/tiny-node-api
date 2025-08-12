/*
 * Imports
 */
import http from 'node:http'
// import { jwtVerify, createRemoteJWKSet, errors as joseErrors} from 'jose'
import * as jose from 'jose'

import * as errors from './errors'
import { logger } from '../core'

const ISSUER = process.env.ZITADEL_ISSUER
const AUDIENCE = process.env.ZITADEL_AUDIENCE
const JWKS = jose.createRemoteJWKSet(new URL(`${ISSUER.replace(/\/$/, '')}/oauth/v2/keys`))
// const REALM = 'Config API'

export async function auth(request: http.IncomingMessage): Promise<jose.JWTPayload> {
	const token = getBearerToken(request)
	if (!token) throw new errors.AuthTokenMissingError()
	try {
		const { payload } = await jose.jwtVerify(token, JWKS, {
			issuer: ISSUER.replace(/\/$/, ''),
			audience: AUDIENCE,
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

function getBearerToken(request: http.IncomingMessage): string | null {
	const token = request?.headers?.authorization?.split(' ')
	if (token && token[0] === 'Bearer' && token[1]) return token[1]
	return null
}
