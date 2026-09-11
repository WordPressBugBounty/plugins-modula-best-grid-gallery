/**
 * Bulk Editor (listing) — entitlement, eligibility, and Pro open adapter.
 *
 * Opens the Pro classic Bulk Editor in list mode for one gallery (ADR 0024).
 * Hidden when not entitled; never albums. Distinct from takeover bulk edit.
 */

/**
 * Whether Bulk Editor (listing) is entitled (licensed Compatible Pro).
 *
 * @param {{ canUseBulkEditor?: boolean }|null|undefined} config Listing bootstrap config.
 * @return {boolean}
 */
export function isListingBulkEditorEntitled(config) {
	return Boolean(config?.canUseBulkEditor);
}

/**
 * Whether Bulk Editor (listing) applies to this row.
 *
 * @param {Object|null|undefined}                                    item Listing row.
 * @param {{ canUseBulkEditor?: boolean }|null|undefined} [options] Entitlement options.
 * @return {boolean}
 */
export function isListingBulkEditorEligible(item, options = {}) {
	if (!item || item.type !== 'gallery') {
		return false;
	}
	if (item.status === 'trash') {
		return false;
	}
	if (item.canEdit !== true) {
		return false;
	}
	return isListingBulkEditorEntitled(options);
}

/**
 * Ask Pro to open the classic Bulk Editor for a gallery id (list mode).
 *
 * @param {number|string} galleryId Gallery post id.
 * @return {boolean} Whether the Pro open API handled the request.
 */
export function openListingBulkEditor(galleryId) {
	const open =
		typeof window !== 'undefined'
			? window.modula?.bulkEditor?.open
			: undefined;
	if (typeof open !== 'function') {
		return false;
	}
	open(galleryId);
	return true;
}
