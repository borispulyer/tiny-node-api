/*
 * Imports
 */
import type { BootstrapTypes } from '@/core'

/*
 * Type Definitions
 */
export type InitCtx = Pick<BootstrapTypes.AppContext, 'config' | 'logger' | 'parser'>
export type ConstructorCtx = {
	config: {
		server: {
			path: {
				public: string
			}
		}
	}
	logger: InitCtx['logger']
	parser: InitCtx['parser']
}
export type ConstructorSetup = {
	index: ModifiersIndex
}
export type ModifiersIndex = Map<string, ModifierModules>
export type ModifierModules = {
	selector: string
	fn: (data: any, options: any, ctx: ConstructorCtx) => Promise<any>
}
