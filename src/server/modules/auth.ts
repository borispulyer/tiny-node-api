/*
 * Imports
 */
import http from 'node:http'
import { JWTPayload } from 'jose'
import * as Auth from '@/auth'
import * as errors from '@/errors'
import { config, logger } from '@/core'

/**
 * Authenticate a request using configured OAuth2 provider.
 * @param request - Incoming HTTP request.
 * @returns JWT payload if authentication succeeds or undefined if disabled.
 */
export async function auth(request: http.IncomingMessage): Promise<JWTPayload | undefined> {
	if (config.auth.enable) {
		try {
			const token = await Auth.auth(request)
			;(request as any).user = { sub: token?.sub, username: token?.preferred_username }
			return token
		} catch (error: any) {
			logger.debug({ module: 'server', error })
			if (error instanceof Auth.AuthConfigurationError) {
				throw new errors.ConfigurationError(`${error.message}`, config.auth)
			}
			if (error instanceof Auth.AuthError) {
				throw new errors.HttpError(`Unauthorized`, error.header.status, {
					'WWW-Authenticate': error.getWWWAuthenticateHeader(),
				})
			}
			throw error
		}
	}
	return undefined
}
