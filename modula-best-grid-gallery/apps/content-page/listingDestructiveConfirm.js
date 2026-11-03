/**
 * Copy helpers for listing row trash / permanent-delete ConfirmDialog.
 */

import { __, sprintf } from '@wordpress/i18n';
import { decodeListingTitle } from './listingRowToFields';
import { getListingRowActionLabel } from './listingRowActions';

/** @typedef {'trash'|'delete-permanently'|'restore-classic-editor'} ListingDestructiveConfirmAction */

/**
 * @param {ListingDestructiveConfirmAction|string} actionId
 * @return {boolean}
 */
export function isListingDestructiveConfirmAction(actionId) {
	return (
		actionId === 'trash' ||
		actionId === 'delete-permanently' ||
		actionId === 'restore-classic-editor'
	);
}

/** @type {Record<ListingDestructiveConfirmAction, string>} */
const CONFIRM_TITLES = {
	trash: __('Move to trash?', 'modula-best-grid-gallery'),
	'delete-permanently': __('Delete permanently?', 'modula-best-grid-gallery'),
	'restore-classic-editor': __(
		'Restore classic editor?',
		'modula-best-grid-gallery'
	),
};

/**
 * The ConfirmDialog title: the control's verb as a question. Row and bulk
 * confirms share it; the message carries the row or the count.
 *
 * @param {ListingDestructiveConfirmAction} actionId
 * @return {string} Title, empty for an action that does not confirm.
 */
export function getListingDestructiveConfirmTitle(actionId) {
	return CONFIRM_TITLES[actionId] ?? '';
}

/**
 * @param {ListingDestructiveConfirmAction} actionId
 * @param {Object}                          item
 * @return {string}
 */
export function getListingDestructiveConfirmMessage(actionId, item) {
	const isAlbum = item?.type === 'album';

	if (actionId === 'restore-classic-editor') {
		return __(
			'Restore classic editor settings from the Convert backup? Beta editor settings for this gallery will be discarded. The shortcode stays the same.',
			'modula-best-grid-gallery'
		);
	}

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
 * @param {Object}                          item
 * @return {string}
 */
export function getListingDestructiveConfirmButtonLabel(actionId, item) {
	return getListingRowActionLabel(actionId, item);
}
