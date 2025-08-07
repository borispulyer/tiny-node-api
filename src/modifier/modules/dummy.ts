/*
 * Imports
 */
import path from 'node:path'
import * as errors from '../errors'
import * as Parser from '@/parser'
import type { Modifier } from '.'

export default {
	selector: 'dummy',
	fn: async (data: any): Promise<any> => {
		return { message: 'This is a dummy modifier.' }
	},
} satisfies Modifier
