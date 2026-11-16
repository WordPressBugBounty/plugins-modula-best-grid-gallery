import {
	cloneSettingValue,
	groupedSettingsFields,
	hasSettingsField,
} from './groupedSettingsFields';

/**
 * A settings change derived from the stored state (not an author's edit, e.g.
 * Freeform placements reconciled with the catalog when a gallery opens) is
 * not an unsaved change: each derived field that had no unsaved change takes
 * the derived value as its saved value too. A field that already had unsaved
 * changes keeps them, now including the derived value.
 *
 * @param {Record<string, Record<string, unknown>>} saved   The saved settings to compare against.
 * @param {Record<string, Record<string, unknown>>} derived Fields the normalization changed, with their new values.
 * @param {Record<string, Record<string, unknown>>} unsaved Fields with unsaved changes before it.
 * @return {Record<string, Record<string, unknown>>} New saved settings; `saved` is not modified.
 */
export function adoptDerivedSettings(saved, derived, unsaved) {
	const next = { ...saved };
	for (const { group, key, value } of groupedSettingsFields(derived)) {
		if (hasSettingsField(unsaved, group, key)) {
			continue;
		}
		next[group] = { ...next[group], [key]: cloneSettingValue(value) };
	}
	return next;
}
