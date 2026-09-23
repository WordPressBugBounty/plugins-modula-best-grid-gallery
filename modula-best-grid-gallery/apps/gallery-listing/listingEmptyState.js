/**
 * Create-only listing empty state vs listing toolbar.
 *
 * The create-only empty state is for a gallery listing with no rows in any
 * SHOW status, including In the trash. Any remaining status keeps the
 * listing toolbar so SHOW can change.
 */

import { LISTING_STATUS_FILTER_VALUES } from './listingToolbarView';

/**
 * @param {{ publish?: number, draft?: number, private?: number, trash?: number }|null|undefined} statusCounts
 * @return {boolean} Whether the create-only empty state should replace the listing.
 */
export function shouldShowCreateOnlyEmptyState(statusCounts) {
	if (!statusCounts || typeof statusCounts !== 'object') {
		return false;
	}

	return LISTING_STATUS_FILTER_VALUES.every(
		(status) => !(Number(statusCounts[status]) > 0)
	);
}
