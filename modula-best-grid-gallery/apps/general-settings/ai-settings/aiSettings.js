import { mapWpLocaleToAiLanguage } from 'gallery-shared/utils/modulaAiAvailability';
import { LANGUAGES } from './settings-form/languages';

// Modula AI options the global Save stores; the AI settings route returns
// their current values with the credits.
export const AI_API_KEY_OPTION = 'modula_ai_api_key';
export const AI_LANGUAGE_OPTION = 'modula_ai_language';
// Where a new API key is claimed.
export const AI_CLAIM_URL = 'https://wp-modula.com/my-account';

/**
 * The AI language to show: the one the AI settings route returns (stored, or
 * mapped from the Site Language), else the Site Language the page prints.
 *
 * @param {Object|undefined} data AI settings route response.
 * @return {string} Language code.
 */
export function resolveAiLanguage(data) {
	if (data?.language) {
		return data.language;
	}
	const codes = LANGUAGES.map((lang) => lang.value);
	const siteLocale =
		typeof window !== 'undefined' && window.modulaAiAvailability?.siteLocale
			? window.modulaAiAvailability.siteLocale
			: '';
	return mapWpLocaleToAiLanguage(siteLocale || 'en', codes);
}

/**
 * Whether the Modula AI debug actions show (`localStorage.modulaDebug`).
 *
 * @return {boolean} Whether debug mode is on.
 */
export function isAiDebugMode() {
	return (
		typeof window !== 'undefined' &&
		window.localStorage.getItem('modulaDebug') === 'true'
	);
}
