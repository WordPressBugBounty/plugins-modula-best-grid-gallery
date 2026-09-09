import { resolveProGateLock } from './proGateLock';

/**
 * @param {{ isPro?: boolean, extensionEntitlements?: Record<string, { available?: boolean, enabled?: boolean }>, galleryDefaults?: { featureEnabled?: boolean } }} editor
 * @returns {boolean}
 */
export function isGalleryDefaultsEntitled(editor) {
	if (!editor?.isPro) {
		return false;
	}
	return resolveProGateLock(
		{ kind: 'requiresExtension', extensionSlug: 'modula-defaults' },
		editor
	).allowed;
}

/**
 * @param {{ galleryDefaults?: { presetCount?: number } }} editor
 * @returns {boolean}
 */
export function hasGalleryDefaultsPresets(editor) {
	return Number(editor?.galleryDefaults?.presetCount || 0) > 0;
}
