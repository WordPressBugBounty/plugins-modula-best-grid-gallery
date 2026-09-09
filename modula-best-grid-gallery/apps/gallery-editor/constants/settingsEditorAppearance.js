/** @typedef {'light' | 'dark'} SettingsEditorAppearance */
/** @typedef {'light' | 'dark' | 'system'} EditorAppearancePreference */

export const SETTINGS_EDITOR_APPEARANCE_STORAGE_KEY =
	'modula-settings-editor-appearance';

/** Mirrors storage on `<html>` for pre-React takeover boot CSS. */
export const SETTINGS_EDITOR_APPEARANCE_DOCUMENT_ATTR =
	'data-modula-se-appearance';

export const APPEARANCE_LIGHT = /** @type {const} */ ('light');
export const APPEARANCE_DARK = /** @type {const} */ ('dark');
export const APPEARANCE_SYSTEM = /** @type {const} */ ('system');

const VALID_RESOLVED = new Set([APPEARANCE_LIGHT, APPEARANCE_DARK]);
const VALID_PREFERENCES = new Set([
	APPEARANCE_LIGHT,
	APPEARANCE_DARK,
	APPEARANCE_SYSTEM,
]);

/**
 * @param {EditorAppearancePreference} preference
 * @param {SettingsEditorAppearance}   [systemScheme]
 * @return {SettingsEditorAppearance} Light or dark to paint.
 */
export function resolveEditorAppearance(preference, systemScheme) {
	if (preference !== APPEARANCE_SYSTEM) {
		return preference === APPEARANCE_DARK
			? APPEARANCE_DARK
			: APPEARANCE_LIGHT;
	}
	if (systemScheme === APPEARANCE_DARK || systemScheme === APPEARANCE_LIGHT) {
		return systemScheme;
	}
	if (
		typeof window !== 'undefined' &&
		typeof window.matchMedia === 'function'
	) {
		try {
			if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
				return APPEARANCE_DARK;
			}
		} catch {
			// Unsupported matchMedia — fall back to light.
		}
	}
	return APPEARANCE_LIGHT;
}

/**
 * @param {SettingsEditorAppearance} appearance
 */
export function syncDocumentAppearance(appearance) {
	if (typeof document === 'undefined' || !VALID_RESOLVED.has(appearance)) {
		return;
	}
	document.documentElement.setAttribute(
		SETTINGS_EDITOR_APPEARANCE_DOCUMENT_ATTR,
		appearance
	);
}

/**
 * @param {EditorAppearancePreference} preference
 * @param {SettingsEditorAppearance}   [systemScheme]
 */
export function syncResolvedDocumentAppearance(preference, systemScheme) {
	syncDocumentAppearance(resolveEditorAppearance(preference, systemScheme));
}

/**
 * @return {EditorAppearancePreference} Stored choice, or system when missing.
 */
export function readStoredPreference() {
	if (typeof window === 'undefined') {
		return APPEARANCE_SYSTEM;
	}
	try {
		const raw = window.localStorage?.getItem(
			SETTINGS_EDITOR_APPEARANCE_STORAGE_KEY
		);
		if (
			raw &&
			VALID_PREFERENCES.has(
				/** @type {EditorAppearancePreference} */ (raw)
			)
		) {
			return /** @type {EditorAppearancePreference} */ (raw);
		}
	} catch {
		// Private mode / blocked storage — fall back to default.
	}
	return APPEARANCE_SYSTEM;
}

/**
 * @return {SettingsEditorAppearance} Stored light or dark, or light when missing.
 */
export function readStoredAppearance() {
	if (typeof window === 'undefined') {
		return APPEARANCE_LIGHT;
	}
	try {
		const raw = window.localStorage?.getItem(
			SETTINGS_EDITOR_APPEARANCE_STORAGE_KEY
		);
		if (
			raw &&
			VALID_RESOLVED.has(/** @type {SettingsEditorAppearance} */ (raw))
		) {
			return /** @type {SettingsEditorAppearance} */ (raw);
		}
	} catch {
		// Private mode / blocked storage — fall back to default.
	}
	return APPEARANCE_LIGHT;
}

/**
 * @param {EditorAppearancePreference} preference
 * @param {SettingsEditorAppearance}   [systemScheme]
 */
export function writeStoredPreference(preference, systemScheme) {
	if (typeof window === 'undefined' || !VALID_PREFERENCES.has(preference)) {
		return;
	}
	try {
		window.localStorage?.setItem(
			SETTINGS_EDITOR_APPEARANCE_STORAGE_KEY,
			preference
		);
	} catch {
		// Ignore quota / privacy errors.
	}
	syncResolvedDocumentAppearance(preference, systemScheme);
}
