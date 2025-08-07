/*
 * Imports
 */
import path from 'node:path'
import { Modifier } from '.'
import * as errors from '../errors'
import * as Parser from '@/parser'

export default {
	selector: 'uppercase',
	fn: async (data: any, options: any, seen: Set<string>): Promise<any> => {
		return { error: 'Ups!' }
	},
} satisfies Modifier
