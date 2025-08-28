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
	index: FormattersIndex
}
export type FormattersIndex = Map<string, FormatterModules>
export type FormatterModules = {
	selectors: string[]
	mime: string
	fn: (data: any) => Promise<string>
}
