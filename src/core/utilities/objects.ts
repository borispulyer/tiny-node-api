/*
 * Type Definitions
 */
type DeepPartial<T> = T extends Function | Date | RegExp | Map<any, any> | Set<any>
	? T
	: T extends readonly any[]
		? T // Arrays bleiben ganz
		: T extends object
			? { [K in keyof T]?: DeepPartial<T[K]> }
			: T

export function isPlainObject(value: unknown): value is Record<string, unknown> {
	if (value === null || typeof value !== 'object') return false
	const proto = Object.getPrototypeOf(value)
	return proto === Object.prototype || proto === null
}

export function assignSourceToTemplate<T extends Record<string, any>>(
	template: T = {} as T,
	source: DeepPartial<T> | null | undefined = {} as DeepPartial<T>,
	options: {
		overwrite_with_undefined?: boolean
		clone?: boolean
	} = {},
): T {
	// Init
	const { overwrite_with_undefined = false, clone = false } = options
	if (!isPlainObject(template)) return {} as T
	const target: any = clone ? structuredClone(template) : template
	if (!isPlainObject(source)) return target

	// Iterate over own properties
	for (const key of Object.keys(target) as Array<keyof T>) {
		// Init
		const target_value = target[key]
		const source_value = (source as any)[key]

		// Check if own property and not undefined
		if (!Object.hasOwn(source, key)) continue
		if (source_value === undefined && !overwrite_with_undefined) continue

		if (isPlainObject(target_value) && isPlainObject(source_value)) {
			// Recursion on objects...
			assignSourceToTemplate(target_value, source_value, {
				overwrite_with_undefined,
				clone: false,
			})
		} else {
			// ...anything else will be assigned to template
			target[key] = source_value as any
		}
	}
	return target
}

export function assignSourcesToTemplate<T extends Record<string, any>>(
	template: T = {} as T,
	...sources: Array<DeepPartial<T> | null | undefined>
): T {
	for (let i = sources.length - 1; i >= 0; i--) {
		assignSourceToTemplate(template, sources[i] as DeepPartial<T>, { clone: false })
	}
	return template
}

export function cloneSourcesToTemplate<T extends Record<string, any>>(
	template: T = {} as T,
	...sources: Array<DeepPartial<T> | null | undefined>
): T {
	const target: T = structuredClone(template)
	return assignSourcesToTemplate(target, ...sources)
}
