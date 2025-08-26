export default function userById(data, params) {
	// Validation
	if (!Array.isArray(data) || !params || !('id' in params)) return data

	const id = String(params.id)

	// Accept numeric or string ids, perform a string comparison.
	const item = data.find((x) => String(x?.id) === id)

	// Return null if not found (client gets `null` as JSON).
	return item ?? null
}
