/**
 * Resolve the gallery post ID on wp-admin post-new / post.php screens.
 *
 * @param {Record<string, unknown>} [config] `modulaSettingsEditor` bootstrap.
 * @return {number}
 */
export function resolveGalleryAdminPostId(config = {}) {
	const fromConfig = Number(config.galleryId) || 0;
	if (fromConfig > 0) {
		return fromConfig;
	}
	if (typeof document === 'undefined') {
		return 0;
	}
	const el = document.getElementById('post_ID');
	if (!el || !el.value) {
		return 0;
	}
	const fromInput = parseInt(String(el.value), 10);
	return Number.isFinite(fromInput) && fromInput > 0 ? fromInput : 0;
}
