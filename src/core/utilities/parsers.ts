/*
 * Imports
 */
import { configTypes } from '@/core'

export function parseBool(value: unknown): boolean | undefined {
	if (typeof value !== 'string') return undefined
	const tmp = value.trim().toLowerCase()
	if (['1', 'true', 'yes', 'y', 'on'].includes(tmp)) return true
	if (['0', 'false', 'no', 'n', 'off'].includes(tmp)) return false
	return undefined
}

export function parseNum(value: unknown): number | undefined {
	const num = Number(value)
	if (!isNaN(num)) return num
	return undefined
}

export function parsePort(value: unknown): number | undefined {
	const num = parseNum(value)
	if (num && Number.isInteger(num) && num >= 1 && num <= 65535) return num
	return undefined
}

export function parseString(value: unknown): string | undefined {
	if (typeof value === 'string') return value.trim()
	return undefined
}

export function parseLogLevel(value: unknown): configTypes.LogLevel | undefined {
	if (typeof value !== 'string') return undefined
	const str = value.trim().toLocaleLowerCase()
	if (['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'].includes(str))
		return str as configTypes.LogLevel
	return undefined
}

export function parseJson2Array(value: unknown): any[] | undefined {
	if (typeof value !== 'string') return undefined
	const obj = JSON.parse(value)
	if (obj) return Array.isArray(obj) ? obj : [obj]
	return undefined
}
