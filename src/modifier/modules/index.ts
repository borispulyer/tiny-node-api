/*
 * Type Definitions
 */
export type Modifier = {
	selector: string
	fn: (data: any, options?: any, seen?: any) => Promise<any>
}

/**
 * Modifiers
 */
export { default as include } from './include'
export { default as uppercase } from './uppercase'
