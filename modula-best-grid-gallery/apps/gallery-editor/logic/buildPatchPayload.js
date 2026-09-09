import { normalizeGroupedDefaults } from './groupedSettingsNormalize';

/**
 * Build minimal PATCH body: only groups/keys that differ from baseline.
 *
 * @param {Record<string, Record<string, unknown>>} current  Editor state.
 * @param {Record<string, Record<string, unknown>>} baseline Original server snapshot.
 * @return {Record<string, Record<string, unknown>>} Only changed group keys vs. baseline.
 */
export function buildPatchPayload(current, baseline) {
	const cur = /** @type {Record<string, Record<string, unknown>>} */ (
		JSON.parse(
			JSON.stringify(
				current && typeof current === 'object' ? current : {}
			)
		)
	);
	const base = /** @type {Record<string, Record<string, unknown>>} */ (
		JSON.parse(
			JSON.stringify(
				baseline && typeof baseline === 'object' ? baseline : {}
			)
		)
	);
	normalizeGroupedDefaults(cur);
	normalizeGroupedDefaults(base);
	const patch = {};
	for (const group of Object.keys(cur)) {
		const curObj = cur[group];
		if (!curObj || typeof curObj !== 'object' || Array.isArray(curObj)) {
			continue;
		}
		const baseObj =
			base[group] &&
			typeof base[group] === 'object' &&
			!Array.isArray(base[group])
				? base[group]
				: /** @type {Record<string, unknown>} */ ({});
		const out = {};
		for (const key of Object.keys(curObj)) {
			const a = curObj[key];
			const b = baseObj[key];
			if (JSON.stringify(a) !== JSON.stringify(b)) {
				out[key] = a;
			}
		}
		if (Object.keys(out).length > 0) {
			patch[group] = out;
		}
	}
	return patch;
}
