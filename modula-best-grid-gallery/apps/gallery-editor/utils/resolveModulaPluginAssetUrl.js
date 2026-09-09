import { getModulaSettingsEditorConfig } from '../config/modulaSettingsEditorConfig';

/**
 * Build an absolute URL for a plugin asset path (e.g. `assets/images/licensing/by.png`).
 * Uses `pluginUrl` from `modulaSettingsEditor`; returns empty string when path or base is missing.
 *
 * @param {string} relativePath
 * @return {string}
 */
export function resolveModulaPluginAssetUrl(relativePath) {
	if (!relativePath || typeof relativePath !== 'string') {
		return '';
	}
	const trimmed = relativePath.trim();
	if (trimmed === '') {
		return '';
	}
	if (/^https?:\/\//i.test(trimmed)) {
		return trimmed;
	}
	const base = getModulaSettingsEditorConfig().pluginUrl;
	if (!base || typeof base !== 'string') {
		return '';
	}
	const baseNorm = base.replace(/\/?$/, '/');
	const pathNorm = trimmed.replace(/^\//, '');
	return `${baseNorm}${pathNorm}`;
}
