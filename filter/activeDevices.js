export default function activeDevices(data, _params) {
	if (!Array.isArray(data)) return data

	return data
		.filter((d) => d && d.active === true)
		.map((d) => ({
			id: d.id,
			name: d.name,
			lastSeen: d.lastSeen ?? null,
		}))
}
