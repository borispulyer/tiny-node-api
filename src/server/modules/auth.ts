/*
 * Imports
 */
import http from 'node:http'
import { JWTPayload } from 'jose'
import * as Errors from '../server.errors'
import type * as Types from '../server.types'

/**
 * Authenticate a request using configured OAuth2 provider.
 * @param request - Incoming HTTP request.
 * @returns JWT payload if authentication succeeds or undefined if disabled.
 */
export async function run(
	request: http.IncomingMessage,
	ctx: Types.ConstructorCtx,
): Promise<JWTPayload | undefined> {
	if (!ctx.config.auth.enable) return undefined
	try {
		if (!ctx.auth)
			throw new Errors.ConfigurationError(
				`Authentication module is not available. Please check configuration.`,
				ctx.config.auth,
			)
		const token = await ctx.auth.verify(request)
		;(request as any).user = { sub: token?.sub, username: token?.preferred_username }
		return token
	} catch (error: any) {
		ctx.logger.debug({ module: 'server/auth', error })
		if (ctx.auth && error instanceof ctx.auth.errors.AuthConfigurationError) {
			throw new Errors.ConfigurationError(`${error.message}`, ctx.config.auth)
		}
		if (ctx.auth && error instanceof ctx.auth.errors.AuthError) {
			throw new Errors.HttpError(`Unauthorized`, error.header.status, {
				'WWW-Authenticate': error.getWWWAuthenticateHeader(),
			})
		}
		throw error
	}
}
