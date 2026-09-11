import { __ } from '@wordpress/i18n';
import { isListingApplyPresetEligible } from './listingApplyPreset';

/** @typedef {'edit'|'try-new-editor'|'convert-new-editor'|'restore-classic-editor'|'view'|'copy-shortcode'|'duplicate'|'apply-preset'|'trash'|'restore'|'delete-permanently'} ListingRowActionId */

/**
 * @typedef {Object} ListingRowActionDef
 * @property {ListingRowActionId} id
 * @property {(item: Object) => string} getLabel
 * @property {(item: Object) => string} [getDescription]
 * @property {(item: Object, options?: { canUseApplyPreset?: boolean, albumTakeoverAvailable?: boolean }) => boolean} isEligible
 * @property {boolean} [isDestructive]
 * @property {boolean} [showProBadge]
 */

/** @type {Record<ListingRowActionId, ListingRowActionDef>} */
export const LISTING_ROW_ACTION_DEFS = {
	edit: {
		id: 'edit',
		getLabel: (item) =>
			item.type === 'album'
				? __('Edit album', 'modula-best-grid-gallery')
				: __('Edit gallery', 'modula-best-grid-gallery'),
		getDescription: (item) =>
			item.type === 'album'
				? __(
						'Galleries, layout, everything',
						'modula-best-grid-gallery'
					)
				: __('Photos, layout, everything', 'modula-best-grid-gallery'),
		isEligible: (item) => Boolean(item.editUrl) && item.status !== 'trash',
	},
	'try-new-editor': {
		id: 'try-new-editor',
		getLabel: () => __('Try the new editor', 'modula-best-grid-gallery'),
		getDescription: (item) =>
			item.type === 'album'
				? __(
						'Beta copy — original album unchanged',
						'modula-best-grid-gallery'
					)
				: __(
						'Beta copy — original gallery unchanged',
						'modula-best-grid-gallery'
					),
		isEligible: (item, options = {}) => {
			if (item.type === 'album' && options.albumTakeoverAvailable !== true) {
				return false;
			}
			return (
				(item.type === 'gallery' || item.type === 'album') &&
				!item.isBeta &&
				Boolean(item.editUrl) &&
				item.status !== 'trash'
			);
		},
	},
	'convert-new-editor': {
		id: 'convert-new-editor',
		getLabel: () => __('Convert to new editor', 'modula-best-grid-gallery'),
		getDescription: (item) =>
			item.type === 'album'
				? __('Same album and shortcode', 'modula-best-grid-gallery')
				: __('Same gallery and shortcode', 'modula-best-grid-gallery'),
		isEligible: (item, options = {}) => {
			if (item.type === 'album' && options.albumTakeoverAvailable !== true) {
				return false;
			}
			return (
				(item.type === 'gallery' || item.type === 'album') &&
				!item.isBeta &&
				Boolean(item.editUrl) &&
				item.status !== 'trash'
			);
		},
	},
	'restore-classic-editor': {
		id: 'restore-classic-editor',
		getLabel: () => __('Restore classic editor', 'modula-best-grid-gallery'),
		getDescription: () =>
			__(
				'Restore classic settings from the Convert backup',
				'modula-best-grid-gallery'
			),
		isEligible: (item) =>
			item.type === 'gallery' &&
			item.isBeta === true &&
			item.hasClassicSettingsBackup === true &&
			item.status !== 'trash' &&
			Boolean(item.editUrl),
	},
	view: {
		id: 'view',
		getLabel: () => __('View on site', 'modula-best-grid-gallery'),
		isEligible: (item) =>
			Boolean(item.viewUrl) && item.status === 'publish',
	},
	'copy-shortcode': {
		id: 'copy-shortcode',
		getLabel: () => __('Copy shortcode', 'modula-best-grid-gallery'),
		isEligible: (item) => Boolean(item.shortcode),
	},
	duplicate: {
		id: 'duplicate',
		getLabel: (item) =>
			item.type === 'album'
				? __('Duplicate album', 'modula-best-grid-gallery')
				: __('Duplicate gallery', 'modula-best-grid-gallery'),
		isEligible: (item) =>
			(item.type === 'gallery' || item.type === 'album') &&
			Boolean(item.editUrl) &&
			item.status !== 'trash',
	},
	'apply-preset': {
		id: 'apply-preset',
		getLabel: () => __('Apply preset', 'modula-best-grid-gallery'),
		getDescription: (item) =>
			item.type === 'album'
				? __(
						'Overwrite album settings from a saved preset',
						'modula-best-grid-gallery'
					)
				: __(
						'Overwrite gallery settings from a saved preset',
						'modula-best-grid-gallery'
					),
		isEligible: (item, options = {}) =>
			isListingApplyPresetEligible(item, options),
	},
	trash: {
		id: 'trash',
		getLabel: () => __('Move to trash', 'modula-best-grid-gallery'),
		isEligible: (item) =>
			item.status !== 'trash' && item.canDelete === true,
		isDestructive: true,
	},
	restore: {
		id: 'restore',
		getLabel: () => __('Restore', 'modula-best-grid-gallery'),
		isEligible: (item) => item.status === 'trash' && item.canEdit === true,
	},
	'delete-permanently': {
		id: 'delete-permanently',
		getLabel: () => __('Delete permanently', 'modula-best-grid-gallery'),
		isEligible: (item) =>
			item.status === 'trash' && item.canDelete === true,
		isDestructive: true,
	},
};

/** @type {ListingRowActionId[][]} */
const LIVE_ROW_MENU_GROUPS = [
	[
		'edit',
		'try-new-editor',
		'convert-new-editor',
		'restore-classic-editor',
		'view',
	],
	['copy-shortcode', 'duplicate'],
	['apply-preset'],
	['trash'],
];

/** @type {ListingRowActionId[][]} */
const TRASH_ROW_MENU_GROUPS = [['restore', 'delete-permanently']];

/**
 * @param {ListingRowActionId[][]} groups
 * @param {Object} item
 * @param {{ canUseStandalone?: boolean, canUseApplyPreset?: boolean, albumTakeoverAvailable?: boolean }} [options]
 * @return {ListingRowActionDef[][]}
 */
function filterMenuGroups(groups, item, options = {}) {
	return groups
		.map((group) =>
			group
				.map((id) => LISTING_ROW_ACTION_DEFS[id])
				.filter((action) => action.isEligible(item, options))
		)
		.filter((group) => group.length > 0);
}

/**
 * @param {ListingRowActionDef} action
 * @param {{ canUseStandalone?: boolean }} [options]
 * @return {ListingRowActionDef}
 */
function decorateListingRowAction(action, options) {
	if (action.id !== 'view') {
		return action;
	}
	return {
		...action,
		showProBadge: options?.canUseStandalone !== true,
	};
}

/**
 * Menu groups for a listing row (dividers between groups).
 *
 * @param {Object} item
 * @param {{ canUseStandalone?: boolean, canUseApplyPreset?: boolean, albumTakeoverAvailable?: boolean }} [options]
 * @return {ListingRowActionDef[][]}
 */
export function getListingRowMenuGroups(item, options = {}) {
	const groups =
		item?.status === 'trash'
			? filterMenuGroups(TRASH_ROW_MENU_GROUPS, item, options)
			: filterMenuGroups(LIVE_ROW_MENU_GROUPS, item, options);
	return groups.map((group) =>
		group.map((action) => decorateListingRowAction(action, options))
	);
}

/**
 * @param {ListingRowActionId} actionId
 * @param {Object} item
 * @param {{ canUseApplyPreset?: boolean }} [options]
 * @return {boolean}
 */
export function isListingRowActionEligible(actionId, item, options = {}) {
	const def = LISTING_ROW_ACTION_DEFS[actionId];
	return def ? def.isEligible(item, options) : false;
}

/**
 * @param {ListingRowActionId} actionId
 * @param {Object} item
 * @return {string}
 */
export function getListingRowActionLabel(actionId, item) {
	const def = LISTING_ROW_ACTION_DEFS[actionId];
	return def ? def.getLabel(item) : actionId;
}
