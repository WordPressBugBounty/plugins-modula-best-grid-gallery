/**
 * Convert to new editor (listing bulk) — eligibility, confirm copy, outcomes.
 *
 * Sequential best-effort Convert for live classic galleries. Same convert-beta
 * contract as the row ⋮ action (classic settings backup + `_modula_beta`).
 * Albums are out of scope for this bulk action.
 */

import { __, _n, sprintf } from '@wordpress/i18n';
import {
	getListingRowActionLabel,
	isListingRowActionEligible,
} from './listingRowActions';

/**
 * Whether listing bulk Convert to new editor applies to this row.
 *
 * Galleries only: live classic, editable, with an edit URL.
 *
 * @param {Object|null|undefined} item Listing row.
 * @return {boolean} Whether bulk Convert applies to this row.
 */
export function isListingBulkConvertEligible(item) {
	if (!item || item.type !== 'gallery') {
		return false;
	}
	if (item.canEdit !== true) {
		return false;
	}
	return isListingRowActionEligible('convert-new-editor', item);
}

/**
 * @param {number} count Eligible classic galleries that will be converted.
 * @return {string} Confirm message.
 */
export function getListingBulkConvertConfirmMessage(count) {
	const n = Math.max(0, Number(count) || 0);
	return sprintf(
		/* translators: %d: number of galleries */
		_n(
			'Convert %d gallery to the new editor? Classic settings are backed up. The shortcode stays the same.',
			'Convert %d galleries to the new editor? Classic settings are backed up. Shortcodes stay the same.',
			n,
			'modula-best-grid-gallery'
		),
		n
	);
}

/**
 * @return {string} Confirm button label.
 */
export function getListingBulkConvertConfirmButtonLabel() {
	return getListingRowActionLabel('convert-new-editor', {});
}

/**
 * @param {unknown} error Convert REST / mutation error.
 * @return {boolean} Whether the error is already-Beta.
 */
function isAlreadyBetaConvertError(error) {
	return (
		Boolean(error) &&
		typeof error === 'object' &&
		error.code === 'modula_convert_beta_already_beta'
	);
}

/**
 * Convert eligible classic galleries sequentially (best-effort).
 *
 * @param {Object[]}                           items          Selected live listing rows.
 * @param {(item: Object) => Promise<unknown>} convertGallery Convert one gallery (convert-beta).
 * @return {Promise<{ converted: number, skipped: number, failed: number }>} Outcome counts.
 */
export async function runListingBulkConvert(items, convertGallery) {
	const rows = Array.isArray(items) ? items : [];
	let converted = 0;
	let skipped = 0;
	let failed = 0;

	for (const row of rows) {
		if (!isListingBulkConvertEligible(row)) {
			skipped += 1;
			continue;
		}
		try {
			await convertGallery(row);
			converted += 1;
		} catch (error) {
			if (isAlreadyBetaConvertError(error)) {
				skipped += 1;
			} else {
				failed += 1;
			}
		}
	}

	return { converted, skipped, failed };
}

/**
 * @param {{ converted?: number, skipped?: number, failed?: number }} result Convert outcome.
 * @return {string} Toast copy.
 */
export function formatListingBulkConvertToast({
	converted = 0,
	skipped = 0,
	failed = 0,
} = {}) {
	const c = Math.max(0, Number(converted) || 0);
	const s = Math.max(0, Number(skipped) || 0);
	const f = Math.max(0, Number(failed) || 0);

	return sprintf(
		/* translators: 1: converted count, 2: skipped count, 3: failed count */
		__(
			'Converted: %1$d. Skipped: %2$d. Failed: %3$d.',
			'modula-best-grid-gallery'
		),
		c,
		s,
		f
	);
}
