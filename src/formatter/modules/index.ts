/*
 * Type Definitions
 */
export type Formatter = {
	selectors: string[]
	mime: string
	fn: (data: any) => Promise<string>
}

/**
 * Formatters
 */
export { default as yaml } from './yaml'
export { default as json } from './json'
export { default as js } from './js'
