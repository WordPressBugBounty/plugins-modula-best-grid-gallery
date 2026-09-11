/**
 * Listing bulk bar action catalog — lifecycle (+ optional Apply preset).
 *
 * Pure helpers: given selection, page rows, and entitlement, return available
 * bulk actions and count-based confirm copy. Product chrome lives in the
 * gallery listing toolbar; DataViews bulk footer stays hidden.
 */

import { __, _n, sprintf } from '@wordpress/i18n';
import {
	getListingRowActionLabel,
	isListingRowActionEligible,
} from './listingRowActions';
import {
	getListingSelectionMode,
	listingSelectionItemId,
} from './listingSelection';

/** @typedef {'trash'|'restore'|'delete-permanently'|'apply-preset'} ListingBulkBarActionId */
/** @typedef {'trash'|'delete-permanently'} ListingBulkDestructiveConfirmAction */

/**
 * @typedef {Object} ListingBulkBarAction
 * @property {ListingBulkBarActionId} id                   Action id.
 * @property {string}                 label                Visible button label.
 * @property {boolean}                [isDestructive]      Whether the action is destructive.
 * @property {boolean}                requiresConfirm      Whether ConfirmDialog is required.
 * @property {string}                 [confirmMessage]     Count-based confirm copy.
 * @property {string}                 [confirmButtonLabel] Confirm button verb.
 * @property {Object[]}               items                Eligible rows for this action.
 * @property {boolean}                [disabled]           Whether the control is disabled.
 * @property {string}                 [disabledReason]     Reason shown when disabled.
 */

/**
 * Selected listing rows present on the current page, in selection order.
 *
 * @param {string[]|null|undefined} selection Selection ids.
 * @param {Object[]|null|undefined} pageRows  Current page rows.
 * @return {Object[]} Matched rows.
 */
export function resolveListingSelectionRows(selection, pageRows) {
	const ids = Array.isArray(selection) ? selection : [];
	/** @type {Map<string, Object>} */
	const byId = new Map();
	for (const row of Array.isArray(pageRows) ? pageRows : []) {
		const id = listingSelectionItemId(row);
		if (id) {
			byId.set(id, row);
		}
	}
	/** @type {Object[]} */
	const rows = [];
	for (const id of ids) {
		const row = byId.get(id);
		if (row) {
			rows.push(row);
		}
	}
	return rows;
}

/**
 * @param {ListingBulkDestructiveConfirmAction}                       actionId Action id.
 * @param {{ count?: number, type?: 'gallery'|'album'|'mixed'|null }} options  Count and selection mode.
 * @return {string} Confirm message.
 */
export function getListingBulkDestructiveConfirmMessage(
	actionId,
	{ count = 0, type = 'gallery' } = {}
) {
	const n = Math.max(0, Number(count) || 0);
	const isMixed = type === 'mixed';
	const isAlbum = type === 'album';

	if (actionId === 'trash') {
		if (isMixed) {
			return sprintf(
				/* translators: %d: number of selected items */
				_n(
					'Move %d item to the trash?',
					'Move %d items to the trash?',
					n,
					'modula-best-grid-gallery'
				),
				n
			);
		}
		if (isAlbum) {
			return sprintf(
				/* translators: %d: number of albums */
				_n(
					'Move %d album to the trash?',
					'Move %d albums to the trash?',
					n,
					'modula-best-grid-gallery'
				),
				n
			);
		}
		return sprintf(
			/* translators: %d: number of galleries */
			_n(
				'Move %d gallery to the trash?',
				'Move %d galleries to the trash?',
				n,
				'modula-best-grid-gallery'
			),
			n
		);
	}

	if (isMixed) {
		return sprintf(
			/* translators: %d: number of selected items */
			_n(
				'Delete %d item permanently? This cannot be undone.',
				'Delete %d items permanently? This cannot be undone.',
				n,
				'modula-best-grid-gallery'
			),
			n
		);
	}

	if (isAlbum) {
		return sprintf(
			/* translators: %d: number of albums */
			_n(
				'Delete %d album permanently? This cannot be undone.',
				'Delete %d albums permanently? This cannot be undone.',
				n,
				'modula-best-grid-gallery'
			),
			n
		);
	}

	return sprintf(
		/* translators: %d: number of galleries */
		_n(
			'Delete %d gallery permanently? This cannot be undone.',
			'Delete %d galleries permanently? This cannot be undone.',
			n,
			'modula-best-grid-gallery'
		),
		n
	);
}

/**
 * @param {ListingBulkDestructiveConfirmAction} actionId Action id.
 * @return {string} Confirm button label.
 */
export function getListingBulkDestructiveConfirmButtonLabel(actionId) {
	return getListingRowActionLabel(actionId, {});
}

/**
 * Bulk actions for the current listing selection.
 *
 * Live homogeneous: Move to trash; Apply preset when Defaults-entitled.
 * Live mixed: Move to trash; Apply preset shown disabled when entitled.
 * Trash: Restore (no confirm) and Delete permanently (confirm with count).
 *
 * @param {{
 *   selection?: string[],
 *   pageRows?: Object[],
 *   canUseApplyPreset?: boolean,
 * }} [options] Selection context.
 * @return {ListingBulkBarAction[]} Available bulk actions.
 */
export function getListingBulkBarActions({
	selection = [],
	pageRows = [],
	canUseApplyPreset = false,
} = {}) {
	const selected = resolveListingSelectionRows(selection, pageRows);
	if (selected.length === 0) {
		return [];
	}

	const mode = getListingSelectionMode(selection, pageRows);
	const confirmType =
		mode === 'gallery' || mode === 'album' || mode === 'mixed'
			? mode
			: 'gallery';
	const isTrashSelection = selected.every((row) => row.status === 'trash');
	/** @type {ListingBulkBarAction[]} */
	const actions = [];

	if (!isTrashSelection) {
		const liveItems = selected.filter((row) => row.status !== 'trash');
		const isMixed = mode === 'mixed';
		const liveHomogeneous =
			!isMixed &&
			(mode === 'gallery' || mode === 'album') &&
			liveItems.length > 0 &&
			liveItems.every((row) => row.type === mode);

		if (canUseApplyPreset && liveItems.length > 0) {
			if (liveHomogeneous) {
				const applyItems = liveItems.filter(
					(row) => row.canEdit === true
				);
				if (applyItems.length > 0) {
					actions.push({
						id: 'apply-preset',
						label: __('Apply preset', 'modula-best-grid-gallery'),
						requiresConfirm: false,
						disabled: false,
						items: applyItems,
					});
				}
			} else if (isMixed) {
				actions.push({
					id: 'apply-preset',
					label: __('Apply preset', 'modula-best-grid-gallery'),
					requiresConfirm: false,
					disabled: true,
					disabledReason: __(
						'Select galleries or albums only to apply a preset.',
						'modula-best-grid-gallery'
					),
					items: [],
				});
			}
		}

		const trashItems = selected.filter((row) =>
			isListingRowActionEligible('trash', row)
		);
		if (trashItems.length > 0) {
			actions.push({
				id: 'trash',
				label: __('Move to trash', 'modula-best-grid-gallery'),
				isDestructive: true,
				requiresConfirm: true,
				confirmMessage: getListingBulkDestructiveConfirmMessage(
					'trash',
					{ count: trashItems.length, type: confirmType }
				),
				confirmButtonLabel:
					getListingBulkDestructiveConfirmButtonLabel('trash'),
				items: trashItems,
			});
		}
		return actions;
	}

	const restoreItems = selected.filter((row) =>
		isListingRowActionEligible('restore', row)
	);
	if (restoreItems.length > 0) {
		actions.push({
			id: 'restore',
			label: __('Restore', 'modula-best-grid-gallery'),
			requiresConfirm: false,
			items: restoreItems,
		});
	}

	const deleteItems = selected.filter((row) =>
		isListingRowActionEligible('delete-permanently', row)
	);
	if (deleteItems.length > 0) {
		actions.push({
			id: 'delete-permanently',
			label: __('Delete permanently', 'modula-best-grid-gallery'),
			isDestructive: true,
			requiresConfirm: true,
			confirmMessage: getListingBulkDestructiveConfirmMessage(
				'delete-permanently',
				{ count: deleteItems.length, type: confirmType }
			),
			confirmButtonLabel:
				getListingBulkDestructiveConfirmButtonLabel(
					'delete-permanently'
				),
			items: deleteItems,
		});
	}

	return actions;
}
