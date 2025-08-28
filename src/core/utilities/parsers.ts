/*
 * Imports
 */
import { ConfigTypes } from '@/core'

/**
 * Parse a string into a boolean value.
 * @param value - Input value to parse.
 * @returns Parsed boolean or undefined if invalid.
 */
export function parseBool(value: unknown): boolean | undefined {
	if (typeof value !== 'string') return undefined
	const tmp = value.trim().toLowerCase()
	if (['1', 'true', 'yes', 'y', 'on'].includes(tmp)) return true
	if (['0', 'false', 'no', 'n', 'off'].includes(tmp)) return false
	return undefined
}

/**
 * Parse a value into a number.
 * @param value - Input value to parse.
 * @returns Parsed number or undefined if invalid.
 */
export function parseNum(value: unknown): number | undefined {
	const num = Number(value)
	if (!isNaN(num)) return num
	return undefined
}

/**
 * Parse a value into a valid TCP port number.
 * @param value - Input value to parse.
 * @returns Port number or undefined if invalid.
 */
export function parsePort(value: unknown): number | undefined {
	const num = parseNum(value)
	if (num && Number.isInteger(num) && num >= 1 && num <= 65535) return num
	return undefined
}

/**
 * Parse a value into a trimmed string.
 * @param value - Input value to parse.
 * @returns Parsed string or undefined if invalid.
 */
export function parseString(value: unknown): string | undefined {
	if (typeof value === 'string') return value.trim()
	return undefined
}

/**
 * Parse a value into a logging level.
 * @param value - Input value to parse.
 * @returns Log level or undefined if invalid.
 */
export function parseLogLevel(value: unknown): ConfigTypes.LogLevel | undefined {
	if (typeof value !== 'string') return undefined
	const str = value.trim().toLocaleLowerCase()
	if (['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'].includes(str))
		return str as ConfigTypes.LogLevel
	return undefined
}

/**
 * Parse a JSON string into an array.
 * @param value - JSON string to parse.
 * @returns Array of parsed data or undefined if invalid.
 */
export function parseJson2Array(value: unknown): any[] | undefined {
	if (typeof value !== 'string') return undefined
	try {
		const obj = JSON.parse(value)
		if (obj) return Array.isArray(obj) ? obj : [obj]
	} catch (error: any) {}
	return undefined
}
