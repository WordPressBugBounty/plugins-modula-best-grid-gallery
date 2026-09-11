/**
 * Quick edit (listing) — eligibility and row identity.
 *
 * Modal editor for title / status / slug. Opening is via
 * listing row hover actions (Quick Edit); not the ⋮ menu.
 */

/**
 * Whether Quick edit (listing) may open for this row.
 *
 * Live gallery or album rows with edit capability only — never trash.
 *
 * @param {Object|null|undefined} item
 * @return {boolean}
 */
export function isListingQuickEditEligible(item) {
	if (!item || (item.type !== 'gallery' && item.type !== 'album')) {
		return false;
	}
	if (item.status === 'trash') {
		return false;
	}
	return item.canEdit === true;
}

/**
 * Stable key for the row currently in Quick edit (matches DataViews getItemId).
 *
 * @param {{ type?: string, id?: number }|null|undefined} item
 * @return {string|null}
 */
export function listingQuickEditItemKey(item) {
	if (!item?.type || item.id === null || item.id === undefined) {
		return null;
	}
	return `${item.type}-${item.id}`;
}
