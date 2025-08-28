/*
 * Imports
 */
import type { BootstrapTypes } from '@/core'

/*
 * Type Definitions
 */
export type InitCtx = Pick<BootstrapTypes.AppContext, 'logger'>
export type ConstructorCtx = {
	logger: InitCtx['logger']
}
export type ConstructorSetup = {
	index: ParsersIndex
}
export type ParsersIndex = Map<string, ParserModule>
export type ParserModule = {
	extensions: string[]
	fn: (file: string) => Promise<any>
}
