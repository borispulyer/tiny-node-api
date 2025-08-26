export default function itemsByTag(data, params) {
	if (!Array.isArray(data)) return data

	const raw = params?.tag
	if (!raw) return data

	const wanted = String(raw)
		.split(',')
		.map((s) => s.trim().toLowerCase())
		.filter(Boolean)

	if (wanted.length === 0) return data

	return data.filter((item) => {
		const tags = Array.isArray(item?.tags) ? item.tags : []
		const lower = tags.map((t) => String(t).toLowerCase())
		return wanted.some((w) => lower.includes(w))
	})
}
