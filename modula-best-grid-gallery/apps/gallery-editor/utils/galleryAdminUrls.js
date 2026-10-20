import { getModulaSettingsEditorConfig } from '../config/modulaSettingsEditorConfig';

const DEFAULT_GALLERY_LIST_URL =
	'/wp-admin/edit.php?post_type=modula-gallery&page=modula-gallery-listing';

/**
 * Gallery list admin URL from PHP bootstrap (`listUrl`).
 *
 * @param {Record<string, unknown>} [config]
 * @return {string}
 */
export function getGalleryListUrl(config = getModulaSettingsEditorConfig()) {
	return typeof config.listUrl === 'string' && config.listUrl
		? config.listUrl
		: DEFAULT_GALLERY_LIST_URL;
}

/**
 * Modula AI settings in wp-admin; the panel lives on the AI tab.
 *
 * @param {Record<string, unknown>} [config]
 * @return {string} Settings URL opening the AI tab.
 */
export function getModulaAiSettingsAdminUrl(
	config = getModulaSettingsEditorConfig()
) {
	const listUrl = getGalleryListUrl(config);
	const base = listUrl.split('?')[0];
	return `${base}?post_type=modula-gallery&page=modula&tab=ai`;
}
