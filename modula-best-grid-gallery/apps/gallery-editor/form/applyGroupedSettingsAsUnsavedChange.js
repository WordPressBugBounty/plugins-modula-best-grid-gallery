/**
 * Settings an extension computes for the gallery (Pro Apply preset) enter the
 * editor as one unsaved change: one settings history step, nothing sent. The
 * settings part stores them on Save (ADR 0059).
 *
 * @package
 */

import { cloneGroupedSettings } from './useGallerySettingsForm';
import { normalizeGroupedDefaults } from '../logic/groupedSettingsNormalize';
import {
	groupedSettingsFields,
	isSettingsGroup,
} from '../logic/groupedSettingsFields';

/**
 * The `group.key` fields whose value differs from the form's.
 *
 * @param {Record<string, Record<string, unknown>>} current Form values.
 * @param {Record<string, Record<string, unknown>>} next    Settings to apply.
 * @return {Array<[string, unknown]>} Field names and their new values.
 */
function changedFields(current, next) {
	return groupedSettingsFields(next)
		.filter(
			({ group, key, value }) =>
				JSON.stringify(current?.[group]?.[key]) !==
				JSON.stringify(value)
		)
		.map(({ name, value }) => [name, value]);
}

/**
 * Apply grouped settings onto the settings form as one history step. Fields the
 * settings leave out keep their values; a field equal to the form's is not set.
 *
 * @param {{
 *   form: import('@tanstack/react-form').ReactFormExtendedApi,
 *   undoRedo: { commitSettingsStep: (label: string, mutate: () => void) => void },
 *   settings: Record<string, Record<string, unknown>>,
 *   label: string,
 * }} args
 * @return {number} How many fields changed (0: nothing applied, no history step).
 */
export function applyGroupedSettingsAsUnsavedChange({
	form,
	undoRedo,
	settings,
	label,
}) {
	if (!isSettingsGroup(settings)) {
		return 0;
	}
	const next = cloneGroupedSettings(settings);
	normalizeGroupedDefaults(next);
	const fields = changedFields(form.state.values, next);
	if (fields.length === 0) {
		return 0;
	}
	undoRedo.commitSettingsStep(label, () => {
		for (const [name, value] of fields) {
			form.setFieldValue(name, value);
		}
	});
	return fields.length;
}
