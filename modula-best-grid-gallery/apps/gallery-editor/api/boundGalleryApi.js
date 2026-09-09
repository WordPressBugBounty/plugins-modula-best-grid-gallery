/**
 * Bound gallery Restore AJAX (clears one exclusion).
 */

/**
 * @param {number} galleryId
 * @param {number} attachmentId
 * @return {Promise<Array<{ id: number, title: string, thumbnailUrl?: string }>>}
 */
export async function restoreBoundGalleryExclusion(galleryId, attachmentId) {
	const config =
		typeof window !== 'undefined' ? window.modulaSettingsEditor || {} : {};
	const ajaxUrl =
		typeof config.ajaxUrl === 'string' && config.ajaxUrl
			? config.ajaxUrl
			: typeof window !== 'undefined' && window.ajaxurl
				? window.ajaxurl
				: '';
	const nonce =
		typeof config.boundGalleryRestoreNonce === 'string'
			? config.boundGalleryRestoreNonce
			: '';

	if (!ajaxUrl || !galleryId || !attachmentId) {
		throw new Error('Bound gallery restore is unavailable.');
	}

	const body = new URLSearchParams();
	body.set('action', 'modula_bound_gallery_restore_exclusion');
	body.set('nonce', nonce);
	body.set('gallery_id', String(galleryId));
	body.set('attachment_id', String(attachmentId));

	const res = await fetch(ajaxUrl, {
		method: 'POST',
		credentials: 'same-origin',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
		},
		body: body.toString(),
	});
	const json = await res.json();
	if (!json?.success) {
		const message =
			typeof json?.data?.message === 'string'
				? json.data.message
				: 'Could not restore that attachment.';
		throw new Error(message);
	}
	return Array.isArray(json?.data?.hiddenItems) ? json.data.hiddenItems : [];
}
