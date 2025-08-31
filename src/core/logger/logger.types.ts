/*
 * Imports
 */
import type { BootstrapTypes } from '@/core'
import pino from 'pino'

/*
 * Logger Type Definitions
 */
export type InitCtx = Pick<BootstrapTypes.AppContext, 'config'>
export type InitCtxConfigLogging = InitCtx['config']['logging']
export type ConstructorCtx = {}
export type ConstructorSetup = {
	loggerApp: pino.Logger
	loggerHttp: any
}
export type LogFnRest = pino.LogFn extends (a: any, b?: any, ...r: infer R) => any ? R : never
export type LogLevel = pino.LevelWithSilent
