/**
 * Return simplified entries for devices marked as active.
 * @param {any[]} data - Array of device-like objects.
 * @param {object} _params - Unused parameters.
 * @returns {Array<{id:any,name:any,lastSeen:any|null}>|any[]} Filtered and mapped devices or original data if invalid.
 */
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
