/*
 * Type Definitions
 */
export type Parser = {
	extensions: string[]
	fn: (file: string) => Promise<any>
}

/*
 * Parsers
 */
export { default as yaml } from './yaml'
export { default as json } from './json'
