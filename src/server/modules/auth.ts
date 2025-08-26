/*
 * Imports
 */
import http from 'node:http'
import { JWTPayload } from 'jose'
import * as Auth from '@/auth'
import * as Server from '@/server'
import { config, logger } from '@/core'

/**
 * Authenticate a request using configured OAuth2 provider.
 * @param request - Incoming HTTP request.
 * @returns JWT payload if authentication succeeds or undefined if disabled.
 */
export async function auth(request: http.IncomingMessage): Promise<JWTPayload | undefined> {
	if (!config.auth.enable) return undefined
	try {
		const token = await Auth.auth(request)
		;(request as any).user = { sub: token?.sub, username: token?.preferred_username }
		return token
	} catch (error: any) {
		logger.debug({ module: 'server/auth', error })
		if (error instanceof Auth.AuthConfigurationError) {
			throw new Server.ConfigurationError(`${error.message}`, config.auth)
		}
		if (error instanceof Auth.AuthError) {
			throw new Server.HttpError(`Unauthorized`, error.header.status, {
				'WWW-Authenticate': error.getWWWAuthenticateHeader(),
			})
		}
		throw error
	}
}
