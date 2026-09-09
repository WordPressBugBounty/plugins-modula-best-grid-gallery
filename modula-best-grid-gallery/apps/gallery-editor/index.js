/**
 * Modula gallery edit screen — settings v2 shell (Phase 2).
 */
import { createRoot } from '@wordpress/element';
import { QueryClientProvider } from '@tanstack/react-query';
import apiFetch from '@wordpress/api-fetch';
import {
	getModulaSettingsEditorConfig,
	patchModulaSettingsEditorConfig,
} from './config/modulaSettingsEditorConfig';
import { resolveGalleryAdminPostId } from './utils/resolveGalleryAdminPostId';
import { syncGalleryAdminEditUrl } from './utils/syncGalleryAdminEditUrl';
import { exposeExtensionImportPlatform } from './platform/exposeExtensionImportPlatform';
import { exposeGalleryDefaultsPlatform } from './platform/exposeGalleryDefaultsPlatform';
import { exposeImageProofingPlatform } from './platform/exposeImageProofingPlatform';
import { exposeInstagramPlatform } from './platform/exposeInstagramPlatform';
import { exposePaginationPlatform } from './platform/exposePaginationPlatform';
import { exposeProCorePlatform } from './platform/exposeProCorePlatform';
import { exposeSettingsEditorHost } from './platform/exposeSettingsEditorHost';
import { exposeVideoPlatform } from './platform/exposeVideoPlatform';
import { exposeWatermarkPlatform } from './platform/exposeWatermarkPlatform';
import { queryClient } from './query/client';
import SettingsEditorApp from './SettingsEditorApp';
import './styles/core.scss';

exposeExtensionImportPlatform();
exposeGalleryDefaultsPlatform();
exposeInstagramPlatform();
exposeSettingsEditorHost();
exposeImageProofingPlatform();
exposePaginationPlatform();
exposeVideoPlatform();
exposeWatermarkPlatform();
exposeProCorePlatform();

const localized = getModulaSettingsEditorConfig();
const bootstrapGalleryId = resolveGalleryAdminPostId(localized);
if (bootstrapGalleryId > 0) {
	if (!localized.galleryId) {
		patchModulaSettingsEditorConfig({ galleryId: bootstrapGalleryId });
	}
	syncGalleryAdminEditUrl(bootstrapGalleryId);
}
if (localized.nonce) {
	apiFetch.use(
		apiFetch.createNonceMiddleware(/** @type {string} */ (localized.nonce))
	);
}

/**
 * Load shell CSS for the active editor mode before first paint.
 *
 * @param {boolean} takeover
 * @returns {Promise<void>}
 */
async function loadSettingsEditorShellStyles(takeover) {
	if (takeover) {
		await import('./styles/takeover.scss');
		return;
	}
	await import('./styles/metabox.scss');
}

document.addEventListener('DOMContentLoaded', () => {
	const cfg = getModulaSettingsEditorConfig();
	const mountId = cfg.takeover
		? 'modula-gallery-takeover-root'
		: 'modula-settings-editor-root';
	const el = document.getElementById(mountId);
	if (!el) {
		return;
	}

	void loadSettingsEditorShellStyles(Boolean(cfg.takeover)).then(() => {
		const root = createRoot(el);
		root.render(
			<QueryClientProvider client={queryClient}>
				<SettingsEditorApp />
			</QueryClientProvider>
		);
	});
});
