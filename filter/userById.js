/**
 * Select a single user object by its `id` from an array.
 * @param {any[]} data - Array of user-like objects.
 * @param {{id?: string|number}} params - Parameters containing the `id` to match.
 * @returns {any|null|any[]} The matched user object, null if not found, or original data if invalid input.
 */
export default function userById(data, params) {
	// Validation
	if (!Array.isArray(data) || !params || !('id' in params)) return data

	const id = String(params.id)

	// Accept numeric or string ids, perform a string comparison.
	const item = data.find((x) => String(x?.id) === id)

	// Return null if not found (client gets `null` as JSON).
	return item ?? null
}
