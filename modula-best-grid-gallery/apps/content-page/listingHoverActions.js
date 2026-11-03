/**
 * Listing row hover actions — shortcuts under the title.
 *
 * Hover is a shortcut; the ⋮ menu stays complete.
 */

import { __ } from '@wordpress/i18n';
import { isListingBulkEditorEligible } from './listingBulkEditor';
import { isListingQuickEditEligible } from './listingQuickEdit';
import { isListingRowActionEligible } from './listingRowActions';

/** @typedef {'edit'|'quick-edit'|'duplicate'|'bulk-editor'|'save-as-preset'|'trash'|'restore'|'delete-permanently'} ListingRowHoverActionId */

/**
 * @typedef {Object} ListingRowHoverActionOptions
 * @property {boolean} [canUseBulkEditor]       Pro Bulk Editor is entitled.
 * @property {boolean} [showSaveAsPresetUpsell] Lite: Save as preset carries the PRO pill and opens the Presets upsell.
 */

/**
 * @typedef {Object} ListingRowHoverAction
 * @property {ListingRowHoverActionId} id              Action id.
 * @property {string}                  label           Visible hover link label.
 * @property {boolean}                 [isDestructive] Whether the action is destructive.
 * @property {boolean}                 [isUpsell]      Opens an upsell; drawn with the PRO pill.
 */

/**
 * @typedef {Object} ListingRowHoverActionDef
 * @property {ListingRowHoverActionId}                                          id              Action id.
 * @property {string}                                                           label           Visible hover link label.
 * @property {boolean}                                                          [isDestructive] Whether the action is destructive.
 * @property {boolean}                                                          [isUpsell]      Opens an upsell.
 * @property {(item: Object, options: ListingRowHoverActionOptions) => boolean} isEligible      Whether the action applies to the row.
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
		id: 'duplicate',
		label: __('Duplicate', 'modula-best-grid-gallery'),
		isEligible: (item) => isListingRowActionEligible('duplicate', item),
	},
	{
		id: 'bulk-editor',
		label: __('Bulk Editor', 'modula-best-grid-gallery'),
		isEligible: (item, options) =>
			isListingBulkEditorEligible(item, options),
	},
	{
		// Pro has no listing host to save a preset from yet; Lite shows the upsell.
		id: 'save-as-preset',
		label: __('Save as preset', 'modula-best-grid-gallery'),
		isUpsell: true,
		isEligible: (item, options) =>
			Boolean(options.showSaveAsPresetUpsell) && item.canEdit === true,
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
 * Live rows: Edit / Quick Edit / Duplicate / Bulk Editor / Save as preset / Trash.
 * Trash rows: Restore / Delete permanently.
 * Bulk Editor (listing) only when entitled (galleries only; never albums).
 * Save as preset only as the Lite upsell.
 * Duplicate uses the same eligibility as listing row actions; hover label is the short verb.
 *
 * @param {Object|null|undefined}        item      Listing row.
 * @param {ListingRowHoverActionOptions} [options]
 * @return {ListingRowHoverAction[]} Eligible hover actions in display order.
 */
export function getListingRowHoverActions(item, options = {}) {
	if (!item || (item.type !== 'gallery' && item.type !== 'album')) {
		return [];
	}

	const defs =
		item.status === 'trash'
			? TRASH_ROW_HOVER_ACTIONS
			: LIVE_ROW_HOVER_ACTIONS;

	return defs
		.filter((action) => action.isEligible(item, options))
		.map(({ id, label, isDestructive, isUpsell }) => ({
			id,
			label,
			...(isDestructive ? { isDestructive } : {}),
			...(isUpsell ? { isUpsell } : {}),
		}));
}
