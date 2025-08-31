/**
 * Retrieve a nested object branch using dot-notation path (e.g., "a.b.c").
 * @param {object} data - Root object to traverse.
 * @param {{path?: string}} params - Parameters containing the `path` string.
 * @returns {any|null|object} The resolved branch value, null if missing, or original data if invalid input.
 */
export default function sectionByPath(data, params) {
	const path = params?.path
	if (!path || typeof data !== 'object' || data === null) return data

	// Support dot-notation: "a.b.c"
	const keys = String(path).split('.').filter(Boolean)

	let current = data
	for (const k of keys) {
		if (current && typeof current === 'object' && k in current) {
			current = current[k]
		} else {
			return null // branch not found
		}
	}
	return current
}
