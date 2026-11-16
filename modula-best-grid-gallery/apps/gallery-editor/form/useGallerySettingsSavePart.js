/**
 * Gallery settings (Freeform placements included) as a part of the editor
 * save session: an edit stays an unsaved change until the editor save, which
 * sends one settings PATCH with the changed fields (ADR 0059). The recovery
 * copy keeps those changed fields; Restore applies them as one settings step.
 */
import { useCallback, useEffect } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { useEditorSavePart, useEditorSavedStateSync } from 'editor-shell';
import { GALLERY_SAVE_PARTS } from '../constants/gallerySaveParts';
import {
	groupedSettingsFields,
	hasSettingsField,
	isSettingsGroup,
} from '../logic/groupedSettingsFields';

/**
 * The fields a recovery snapshot sets: grouped settings, `{ group: { key: value } }`,
 * as `getPendingSettingsPatch` returns them. The copy comes from browser
 * storage, so only fields the gallery's settings have are kept: the loaded
 * settings carry every field of the settings schema (Pro's included).
 * Values are checked by the save, like any edit.
 *
 * @param {unknown}                                 snapshot
 * @param {Record<string, Record<string, unknown>>} current  The form's settings.
 * @return {Array<[string, unknown]>} Field names (`group.key`) and values; none when the snapshot is not grouped settings.
 */
function settingsRecoveryFields(snapshot, current) {
	const isGrouped =
		isSettingsGroup(snapshot) &&
		Object.values(snapshot).every(isSettingsGroup);
	if (!isGrouped) {
		return [];
	}
	return groupedSettingsFields(snapshot)
		.filter(({ group, key }) => hasSettingsField(current, group, key))
		.map(({ name, value }) => [name, value]);
}

/**
 * @param {import('./GallerySettingsFormContext').GallerySettingsFormBundle} bundle The settings form bundle.
 */
export function useGallerySettingsSavePart({
	form,
	undoRedo,
	getPendingSettingsPatch,
	saveSettings,
	subscribeStoredWrites,
}) {
	const syncSavedState = useEditorSavedStateSync();
	const hasUnsavedChanges = useCallback(
		() => Object.keys(getPendingSettingsPatch()).length > 0,
		[getPendingSettingsPatch]
	);
	// The settings PATCH does not run through the write queue: report its marker here.
	const save = useCallback(async () => {
		syncSavedState(await saveSettings());
	}, [saveSettings, syncSavedState]);

	const restoreRecoverySnapshot = useCallback(
		(snapshot) => {
			const fields = settingsRecoveryFields(snapshot, form.state.values);
			if (fields.length === 0) {
				return;
			}
			undoRedo.commitSettingsStep(
				__('Restore unsaved changes', 'modula-best-grid-gallery'),
				() => {
					for (const [name, value] of fields) {
						form.setFieldValue(name, value);
					}
				}
			);
		},
		[form, undoRedo]
	);

	const notifyChange = useEditorSavePart({
		key: GALLERY_SAVE_PARTS.settings,
		hasUnsavedChanges,
		save,
		getRecoverySnapshot: getPendingSettingsPatch,
		restoreRecoverySnapshot,
	});

	// Every form change may add or remove unsaved settings.
	useEffect(() => form.store.subscribe(notifyChange), [form, notifyChange]);

	/*
	 * An immediate action stored settings outside the save (Pro proofing
	 * lock): its marker is the saved state now, and the saved values moved
	 * even where the form did not change.
	 */
	useEffect(
		() =>
			subscribeStoredWrites?.((response) => {
				syncSavedState(response);
				notifyChange();
			}),
		[subscribeStoredWrites, syncSavedState, notifyChange]
	);
}
