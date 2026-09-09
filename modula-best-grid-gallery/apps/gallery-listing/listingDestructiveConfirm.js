/**
 * Copy helpers for listing row trash / permanent-delete ConfirmDialog.
 */

import { __, sprintf } from '@wordpress/i18n';
import { decodeListingTitle } from './listingRowToFields';
import { getListingRowActionLabel } from './listingRowActions';

/** @typedef {'trash'|'delete-permanently'} ListingDestructiveConfirmAction */

/**
 * @param {ListingDestructiveConfirmAction} actionId
 * @return {boolean}
 */
export function isListingDestructiveConfirmAction(actionId) {
	return actionId === 'trash' || actionId === 'delete-permanently';
}

/**
 * @param {ListingDestructiveConfirmAction} actionId
 * @param {Object} item
 * @return {string}
 */
export function getListingDestructiveConfirmMessage(actionId, item) {
	const isAlbum = item?.type === 'album';

	if (actionId === 'trash') {
		return isAlbum
			? __('Move this album to the trash?', 'modula-best-grid-gallery')
			: __('Move this gallery to the trash?', 'modula-best-grid-gallery');
	}

	const title = decodeListingTitle(item?.title);
	if (isAlbum) {
		return sprintf(
			/* translators: %s: album title */
			__(
				'Delete “%s” permanently? This cannot be undone.',
				'modula-best-grid-gallery'
			),
			title
		);
	}

	return sprintf(
		/* translators: %s: gallery title */
		__(
			'Delete “%s” permanently? This cannot be undone.',
			'modula-best-grid-gallery'
		),
		title
	);
}

/**
 * @param {ListingDestructiveConfirmAction} actionId
 * @param {Object} item
 * @return {string}
 */
export function getListingDestructiveConfirmButtonLabel(actionId, item) {
	return getListingRowActionLabel(actionId, item);
}
