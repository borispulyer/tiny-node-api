/*
 * Imports
 */
import type { Modifier } from '.'

export default {
	selector: 'dummy',
	fn: async (data: any): Promise<any> => {
		return { message: 'This is a dummy modifier.' }
	},
} satisfies Modifier
