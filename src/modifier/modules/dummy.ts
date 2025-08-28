/*
 * Imports
 */
import type * as Types from '../modifier.types'

/**
 * Dummy Modifier
 */
export default {
	selector: 'dummy',
	/**
	 * Dummy modifier returning a placeholder object.
	 * @param data - Input data (unused).
	 * @returns Dummy object.
	 */
	fn: async (data: any): Promise<any> => {
		return { message: 'This is a dummy modifier.' }
	},
} satisfies Types.ModifierModules
