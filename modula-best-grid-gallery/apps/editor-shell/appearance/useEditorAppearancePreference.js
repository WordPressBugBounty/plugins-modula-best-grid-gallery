/**
 * The stored appearance preference and the appearance it paints. Kept out of
 * the provider module so Jest, which cannot import JSX modules, can render it.
 */
import { useCallback, useLayoutEffect, useState } from '@wordpress/element';
import {
	isAppearancePreference,
	persistPreference,
	readStoredPreference,
	resolveEditorAppearance,
	syncDocumentAppearance,
} from './settingsEditorAppearance';

/**
 * @typedef {import('./settingsEditorAppearance').EditorAppearancePreference} EditorAppearancePreference
 * @typedef {import('./settingsEditorAppearance').SettingsEditorAppearance} SettingsEditorAppearance
 */

/**
 * System is resolved against the OS at load and on each explicit choice, and
 * never on its own (ADR 0014). The resolved appearance is held in state and
 * painted from there alone, so the app, `<html>` and the takeover mount always
 * carry the same one.
 *
 * @return {{
 *   preference: EditorAppearancePreference,
 *   appearance: SettingsEditorAppearance,
 *   setPreference: (next: EditorAppearancePreference) => void
 * }} Stored preference, resolved appearance, and the setter that stores and repaints a choice.
 */
export function useEditorAppearancePreference() {
	const [selection, setSelection] = useState(() => {
		const preference = readStoredPreference();
		return { preference, appearance: resolveEditorAppearance(preference) };
	});

	useLayoutEffect(() => {
		syncDocumentAppearance(selection.appearance);
	}, [selection.appearance]);

	const setPreference = useCallback((next) => {
		if (!isAppearancePreference(next)) {
			return;
		}
		persistPreference(next);
		// A new object even for an unchanged preference: choosing System
		// again repaints from the OS scheme of that moment.
		setSelection({
			preference: next,
			appearance: resolveEditorAppearance(next),
		});
	}, []);

	return { ...selection, setPreference };
}
