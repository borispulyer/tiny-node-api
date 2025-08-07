/*
 * Imports
 */
import path from 'node:path'
import { Modifier } from '.'
import * as errors from '../errors'
import * as Parser from '@/parser'

export default {
	selector: 'dummy',
	fn: async (data: any): Promise<any> => {
		return { message: 'This is a dummy modifier.' }
	},
} satisfies Modifier
