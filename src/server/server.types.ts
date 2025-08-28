/*
 * Imports
 */
import type { BootstrapTypes, Config } from '@/core'

/*
 * Type Definitions
 */
export type InitCtx = Pick<
	BootstrapTypes.AppContext,
	'config' | 'logger' | 'parser' | 'modifier' | 'formatter' | 'auth'
>
export type ConstructorCtx = {
	config: {
		server: InitCtx['config']['server']
		filesystem: InitCtx['config']['filesystem']
		endpoints: InitCtx['config']['endpoints']
		auth: InitCtx['config']['auth']
		parser: InitCtx['config']['parser']
		modifier: InitCtx['config']['modifier']
		formatter: InitCtx['config']['formatter']
	}
	logger: InitCtx['logger']
	parser: InitCtx['parser']
	modifier: InitCtx['modifier']
	formatter: InitCtx['formatter']
	auth: InitCtx['auth']
}
export type ConstructorSetup = {}
