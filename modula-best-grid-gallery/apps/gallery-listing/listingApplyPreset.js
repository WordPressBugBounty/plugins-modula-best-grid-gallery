/**
 * Apply preset (listing) — entitlement, eligibility, and Pro open adapter.
 *
 * Opens the Pro Defaults Apply preset flow for one or more live listing rows.
 * Hidden when not entitled; never trash or hover.
 */

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
 * @return {Promise<{ applied: number, failed: number, unavailable?: boolean }|null>} Result when the flow finishes, null if cancelled.
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
