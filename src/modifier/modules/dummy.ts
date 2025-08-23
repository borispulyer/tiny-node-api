/*
 * Imports
 */
import type { Modifier } from '.'

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
} satisfies Modifier
