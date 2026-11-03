/**
 * Shares the editor appearance (stored preference and resolved appearance)
 * with every surface of the settings editor.
 */

import { createContext, useContext, useMemo } from '@wordpress/element';
import { APPEARANCE_DARK, APPEARANCE_LIGHT } from './settingsEditorAppearance';
import { useEditorAppearancePreference } from './useEditorAppearancePreference';

/** @type {import('react').Context<null | Record<string, unknown>>} */
const SettingsEditorAppearanceContext = createContext(null);

/**
 * @param {Object}                    props
 * @param {import('react').ReactNode} props.children
 */
export function SettingsEditorAppearanceProvider({ children }) {
	const { preference, appearance, setPreference } =
		useEditorAppearancePreference();

	const value = useMemo(
		() => ({
			preference,
			appearance,
			isDark: appearance === APPEARANCE_DARK,
			isLight: appearance === APPEARANCE_LIGHT,
			setPreference,
		}),
		[preference, appearance, setPreference]
	);

	return (
		<SettingsEditorAppearanceContext.Provider value={value}>
			{children}
		</SettingsEditorAppearanceContext.Provider>
	);
}

export function useSettingsEditorAppearance() {
	const ctx = useContext(SettingsEditorAppearanceContext);
	if (!ctx) {
		throw new Error(
			'useSettingsEditorAppearance must be used within SettingsEditorAppearanceProvider'
		);
	}
	return ctx;
}
