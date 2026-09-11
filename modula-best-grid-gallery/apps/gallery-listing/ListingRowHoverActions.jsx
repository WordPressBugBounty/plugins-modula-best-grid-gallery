import { useState } from '@wordpress/element';
import { __experimentalConfirmDialog as ConfirmDialog } from '@wordpress/components';
import {
	getListingDestructiveConfirmButtonLabel,
	getListingDestructiveConfirmMessage,
	isListingDestructiveConfirmAction,
} from './listingDestructiveConfirm';
import { openListingBulkEditor } from './listingBulkEditor';
import { getListingRowHoverActions } from './listingHoverActions';
import { closeListingRowPreview } from './ListingRowPreviewPopover';

/**
 * Shortcuts in the reserved area under a listing row title.
 *
 * Live: Edit / Quick Edit / Bulk Editor / Trash.
 * Trash: Restore / Delete permanently.
 *
 * @param {Object}                                props
 * @param {Object}                                props.item
 * @param {boolean}                               [props.canUseBulkEditor]
 * @param {(item: Object) => void}                [props.requestGalleryEdit]
 * @param {(item: Object) => void}                [props.requestQuickEdit]
 * @param {(items: Object[]) => Promise<unknown>} [props.trashListingRows]
 * @param {(items: Object[]) => Promise<unknown>} [props.restoreListingRows]
 * @param {(items: Object[]) => Promise<unknown>} [props.deleteListingRows]
 */
export function ListingRowHoverActions({
	item,
	canUseBulkEditor = false,
	requestGalleryEdit,
	requestQuickEdit,
	trashListingRows,
	restoreListingRows,
	deleteListingRows,
}) {
	const [pendingConfirm, setPendingConfirm] = useState(
		/** @type {'trash'|'delete-permanently'|null} */ (null)
	);
	const [confirmBusy, setConfirmBusy] = useState(false);
	const actions = getListingRowHoverActions(item, { canUseBulkEditor });

	if (actions.length === 0 && !pendingConfirm) {
		return null;
	}

	const runAction = (actionId) => {
		if (pendingConfirm || confirmBusy) {
			return;
		}

		if (isListingDestructiveConfirmAction(actionId)) {
			setPendingConfirm(actionId);
			return;
		}

		switch (actionId) {
			case 'edit':
				if (typeof requestGalleryEdit === 'function') {
					requestGalleryEdit(item);
				} else if (item.editUrl) {
					window.location.href = item.editUrl;
				}
				break;
			case 'quick-edit':
				if (typeof requestQuickEdit === 'function') {
					requestQuickEdit(item);
				}
				break;
			case 'bulk-editor':
				openListingBulkEditor(item.id);
				break;
			case 'restore':
				if (typeof restoreListingRows === 'function') {
					void restoreListingRows([item]);
				}
				break;
			default:
				break;
		}
	};

	const cancelDestructiveConfirm = () => {
		if (confirmBusy) {
			return;
		}
		setPendingConfirm(null);
	};

	const confirmDestructiveAction = async () => {
		if (!pendingConfirm || confirmBusy) {
			return;
		}

		setConfirmBusy(true);
		try {
			if (pendingConfirm === 'trash') {
				if (typeof trashListingRows === 'function') {
					await trashListingRows([item]);
				}
			} else if (typeof deleteListingRows === 'function') {
				await deleteListingRows([item]);
			}
			setPendingConfirm(null);
		} catch (e) {
			// Keep the dialog open; toast comes later.
		} finally {
			setConfirmBusy(false);
		}
	};

	const stopRowSelect = (event) => {
		event.stopPropagation();
	};

	return (
		<>
			{actions.length > 0 ? (
				<div
					className="modula-gallery-listing__row-hover-actions"
					onClick={stopRowSelect}
					onMouseDown={stopRowSelect}
					onMouseEnter={() => {
						closeListingRowPreview();
					}}
					onFocus={() => {
						closeListingRowPreview();
					}}
				>
					{actions.map((action) => (
						<button
							key={action.id}
							data-quick-edit-key={
								action.id === 'quick-edit'
									? `${item.type}-${item.id}`
									: undefined
							}
							type="button"
							className={
								action.isDestructive
									? 'modula-gallery-listing__row-hover-action is-destructive'
									: 'modula-gallery-listing__row-hover-action'
							}
							onClick={(event) => {
								event.preventDefault();
								event.stopPropagation();
								runAction(action.id);
							}}
							onMouseDown={stopRowSelect}
						>
							{action.label}
						</button>
					))}
				</div>
			) : null}
			<ConfirmDialog
				isOpen={Boolean(pendingConfirm)}
				isBusy={confirmBusy}
				confirmButtonText={
					pendingConfirm
						? getListingDestructiveConfirmButtonLabel(
								pendingConfirm,
								item
							)
						: undefined
				}
				onConfirm={() => {
					void confirmDestructiveAction();
				}}
				onCancel={cancelDestructiveConfirm}
			>
				{pendingConfirm
					? getListingDestructiveConfirmMessage(pendingConfirm, item)
					: null}
			</ConfirmDialog>
		</>
	);
}
