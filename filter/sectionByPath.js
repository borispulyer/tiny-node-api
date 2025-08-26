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
