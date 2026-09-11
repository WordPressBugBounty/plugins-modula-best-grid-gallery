/**
 * Listing row hover actions — shortcuts under the title.
 *
 * Hover is a shortcut; the ⋮ menu stays complete.
 */

import { __ } from '@wordpress/i18n';
import { isListingBulkEditorEligible } from './listingBulkEditor';
import { isListingQuickEditEligible } from './listingQuickEdit';
import { isListingRowActionEligible } from './listingRowActions';

/** @typedef {'edit'|'quick-edit'|'bulk-editor'|'trash'|'restore'|'delete-permanently'} ListingRowHoverActionId */

/**
 * @typedef {Object} ListingRowHoverAction
 * @property {ListingRowHoverActionId} id              Action id.
 * @property {string}                  label           Visible hover link label.
 * @property {boolean}                 [isDestructive] Whether the action is destructive.
 */

/**
 * @typedef {Object} ListingRowHoverActionDef
 * @property {ListingRowHoverActionId}   id              Action id.
 * @property {string}                    label           Visible hover link label.
 * @property {boolean}                   [isDestructive] Whether the action is destructive.
 * @property {(item: Object, options?: { canUseBulkEditor?: boolean }) => boolean} isEligible Whether the action applies to the row.
 */

/** @type {ListingRowHoverActionDef[]} */
const LIVE_ROW_HOVER_ACTIONS = [
	{
		id: 'edit',
		label: __('Edit', 'modula-best-grid-gallery'),
		isEligible: (item) => isListingRowActionEligible('edit', item),
	},
	{
		id: 'quick-edit',
		label: __('Quick Edit', 'modula-best-grid-gallery'),
		isEligible: (item) => isListingQuickEditEligible(item),
	},
	{
		id: 'bulk-editor',
		label: __('Bulk Editor', 'modula-best-grid-gallery'),
		isEligible: (item, options) =>
			isListingBulkEditorEligible(item, options),
	},
	{
		id: 'trash',
		label: __('Trash', 'modula-best-grid-gallery'),
		isDestructive: true,
		isEligible: (item) => isListingRowActionEligible('trash', item),
	},
];

/** @type {ListingRowHoverActionDef[]} */
const TRASH_ROW_HOVER_ACTIONS = [
	{
		id: 'restore',
		label: __('Restore', 'modula-best-grid-gallery'),
		isEligible: (item) => isListingRowActionEligible('restore', item),
	},
	{
		id: 'delete-permanently',
		label: __('Delete permanently', 'modula-best-grid-gallery'),
		isDestructive: true,
		isEligible: (item) =>
			isListingRowActionEligible('delete-permanently', item),
	},
];

/**
 * Ordered hover actions for a gallery or album listing row.
 *
 * Live rows: Edit / Quick Edit / Bulk Editor / Trash.
 * Trash rows: Restore / Delete permanently.
 * Bulk Editor (listing) only when entitled (galleries only; never albums).
 *
 * @param {Object|null|undefined}                                    item Listing row.
 * @param {{ canUseBulkEditor?: boolean }}                  [options]
 * @return {ListingRowHoverAction[]} Eligible hover actions in display order.
 */
export function getListingRowHoverActions(item, options = {}) {
	if (!item || (item.type !== 'gallery' && item.type !== 'album')) {
		return [];
	}

	const defs =
		item.status === 'trash' ? TRASH_ROW_HOVER_ACTIONS : LIVE_ROW_HOVER_ACTIONS;

	return defs
		.filter((action) => action.isEligible(item, options))
		.map(({ id, label, isDestructive }) =>
			isDestructive ? { id, label, isDestructive } : { id, label }
		);
}
