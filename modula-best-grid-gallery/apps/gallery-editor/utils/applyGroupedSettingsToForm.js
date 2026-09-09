/**
 * Apply a full grouped settings document onto TanStack Form.
 *
 * `form.reset(next)` alone can leave mounted Fields (e.g. layout.gridType Select)
 * on a stale nested value; follow with per-key `setFieldValue` so undo/redo sticks.
 *
 * @param {{ reset: Function, setFieldValue: Function }} form
 * @param {Record<string, Record<string, unknown>>} doc
 * @param {(v: Record<string, Record<string, unknown>>) => Record<string, Record<string, unknown>>} cloneGroupedSettings
 * @return {Record<string, Record<string, unknown>>}
 */
export function applyGroupedSettingsToForm(form, doc, cloneGroupedSettings) {
	const next = cloneGroupedSettings(doc ?? {});
	form.reset(next);
	for (const [groupId, group] of Object.entries(next)) {
		if (!group || typeof group !== 'object' || Array.isArray(group)) {
			continue;
		}
		for (const [key, value] of Object.entries(group)) {
			form.setFieldValue(`${groupId}.${key}`, value);
		}
	}
	return next;
}
