/**
 * Editor appearance preference for the settings editor (localStorage, default system).
 */

import {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useState,
} from '@wordpress/element';
import {
	APPEARANCE_DARK,
	APPEARANCE_LIGHT,
	readStoredPreference,
	resolveEditorAppearance,
	syncResolvedDocumentAppearance,
	writeStoredPreference,
} from '../constants/settingsEditorAppearance';

/** @type {import('react').Context<null | Record<string, unknown>>} */
const SettingsEditorAppearanceContext = createContext(null);

/**
 * @param {Object}                    props
 * @param {import('react').ReactNode} props.children
 */
export function SettingsEditorAppearanceProvider({ children }) {
	const [preference, setPreferenceState] = useState(() => {
		const initial = readStoredPreference();
		syncResolvedDocumentAppearance(initial);
		return initial;
	});

	const appearance = resolveEditorAppearance(preference);

	const setPreference = useCallback((next) => {
		setPreferenceState(next);
		writeStoredPreference(next);
	}, []);

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
