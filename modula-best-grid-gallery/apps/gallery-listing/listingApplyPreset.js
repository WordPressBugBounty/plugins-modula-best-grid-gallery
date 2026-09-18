/**
 * Apply preset (listing) — entitlement, eligibility, and Pro open adapter.
 *
 * Opens the Pro Defaults Apply preset flow for one or more live listing rows.
 * Hidden when not entitled; never trash or hover.
 */

import { __ } from '@wordpress/i18n';

/**
 * Whether Apply preset (listing) is entitled (Defaults extension active).
 *
 * @param {{ canUseApplyPreset?: boolean }|null|undefined} config Listing bootstrap config.
 * @return {boolean}
 */
export function isListingApplyPresetEntitled(config) {
	return Boolean(config?.canUseApplyPreset);
}

/**
 * Whether Apply preset (listing) applies to this row.
 *
 * @param {Object|null|undefined}                                       item    Listing row.
 * @param {{ canUseApplyPreset?: boolean }|null|undefined} [options] Entitlement options.
 * @return {boolean}
 */
export function isListingApplyPresetEligible(item, options = {}) {
	if (!item || (item.type !== 'gallery' && item.type !== 'album')) {
		return false;
	}
	if (item.status === 'trash') {
		return false;
	}
	if (item.canEdit !== true) {
		return false;
	}
	return isListingApplyPresetEntitled(options);
}

/**
 * Ask Pro to open Apply preset for listing rows.
 *
 * @param {Object[]} items Homogeneous live listing rows.
 * @return {Promise<{ applied: number, failed: number, unavailable?: boolean, message?: string }|null>} Result when the flow finishes, null if cancelled.
 */
export async function openListingApplyPreset(items) {
	const list = Array.isArray(items) ? items : [];
	const open =
		typeof window !== 'undefined'
			? window.modula?.applyPreset?.open
			: undefined;
	if (typeof open !== 'function') {
		return {
			applied: 0,
			failed: list.length,
			unavailable: true,
		};
	}
	return open(list);
}

/**
 * User-visible feedback for an Apply preset (listing) open result.
 *
 * Cancel (null) → no feedback. Missing host → error notice. Completed apply
 * (including zero applied) → toast message from the Pro host when present.
 *
 * @param {{ applied?: number, failed?: number, unavailable?: boolean, message?: string }|null|undefined} result
 * @return {{ type: 'notice'|'toast', message: string }|null}
 */
export function getListingApplyPresetFeedback(result) {
	if (!result || typeof result !== 'object') {
		return null;
	}
	if (result.unavailable) {
		return {
			type: 'notice',
			message: __(
				'Apply preset is unavailable right now. Refresh the page and try again.',
				'modula-best-grid-gallery'
			),
		};
	}
	if (typeof result.message === 'string') {
		const message = result.message.trim();
		if (message) {
			return { type: 'toast', message };
		}
	}
	return null;
}
