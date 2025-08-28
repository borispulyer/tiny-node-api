/*
 * Imports
 */
import * as jose from 'jose'
import type { BootstrapTypes } from '@/core'

/*
 * Type Definitions
 */
export type InitCtx = Pick<BootstrapTypes.AppContext, 'config' | 'logger'>
export type ConstructorCtx = {
	config: InitCtx['config']['auth']['oauth2']
	logger: InitCtx['logger']
}
export type ConstructorSetup = {
	jwks: ReturnType<typeof jose.createRemoteJWKSet>
}
