/**
 * Quick edit (listing) — eligibility, row identity and the saved message.
 *
 * Inline panel under the row for title / status / slug. Opening is via
 * listing row hover actions (Quick Edit); not the ⋮ menu.
 */

import { __ } from '@wordpress/i18n';
import { listingSelectionItemId } from './listingSelection';

/**
 * Whether Quick edit (listing) may open for this row.
 *
 * Live gallery or album rows with edit capability only — never trash.
 *
 * @param {Object|null|undefined} item
 * @return {boolean} Whether Quick Edit may open.
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
 * Stable key for the row currently in Quick edit: the Table's row id, so it
 * names the row whose expansion holds the panel.
 *
 * @param {{ type?: string, id?: number }|null|undefined} item
 * @return {string|null} `type-id`, or null without both.
 */
export function listingQuickEditItemKey(item) {
	return listingSelectionItemId(item);
}

/**
 * The toast after a Quick edit save, once the listing has been refreshed.
 *
 * @param {Object}                                    args
 * @param {import('./listingRowToFields').ListingRow} args.item         The row as it was opened.
 * @param {{ status?: unknown }|null|undefined}       args.saved        The saved post (REST response).
 * @param {boolean}                                   args.isListed     Whether the refreshed page still lists the row.
 * @param {string[]}                                  args.viewStatuses Statuses the current view lists.
 * @return {string} The toast text.
 */
export function getListingQuickEditSavedMessage({
	item,
	saved,
	isListed,
	viewStatuses,
}) {
	if (item.type === 'gallery' && saved?.status === 'future') {
		return __(
			'Changes saved. This gallery is scheduled and will not be public until its publication date. It is listed under All.',
			'modula-best-grid-gallery'
		);
	}
	if (isListed) {
		return __('Changes saved.', 'modula-best-grid-gallery');
	}
	const leftStatusFilter =
		typeof saved?.status === 'string' &&
		!viewStatuses.includes(saved.status);
	if (leftStatusFilter) {
		return __(
			'Changes saved. This item no longer matches the status filter.',
			'modula-best-grid-gallery'
		);
	}
	return __(
		'Changes saved. This item is not visible in the current listing view.',
		'modula-best-grid-gallery'
	);
}
