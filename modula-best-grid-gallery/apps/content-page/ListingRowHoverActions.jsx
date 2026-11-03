import { Fragment, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { ConfirmDialog, LockIcon } from 'admin-ui';
import {
	getListingDestructiveConfirmButtonLabel,
	getListingDestructiveConfirmMessage,
	getListingDestructiveConfirmTitle,
	isListingDestructiveConfirmAction,
} from './listingDestructiveConfirm';
import { openListingBulkEditor } from './listingBulkEditor';
import { getListingRowHoverActions } from './listingHoverActions';
import { closeListingRowPreview } from './ListingRowPreviewPopover';

/**
 * Shortcuts in the reserved line under a listing row title, separated by
 * bars; they take the item count's place on hover or focus.
 *
 * Live: Edit / Quick Edit / Duplicate / Bulk Editor / Save as preset (Lite
 * upsell) / Trash. Trash: Restore / Delete permanently.
 *
 * @param {Object}                                props
 * @param {Object}                                props.item
 * @param {boolean}                               [props.canUseBulkEditor]
 * @param {(item: Object) => void}                [props.requestGalleryEdit]
 * @param {(item: Object) => void}                [props.requestQuickEdit]
 * @param {(item: Object) => Promise<unknown>}    [props.duplicateListingRow]
 * @param {(items: Object[]) => Promise<unknown>} [props.trashListingRows]
 * @param {(items: Object[]) => Promise<unknown>} [props.restoreListingRows]
 * @param {(items: Object[]) => Promise<unknown>} [props.deleteListingRows]
 * @param {() => void}                            [props.onSaveAsPresetUpsell] Opens the Presets upsell; without it, no Save as preset.
 */
export function ListingRowHoverActions({
	item,
	canUseBulkEditor = false,
	requestGalleryEdit,
	requestQuickEdit,
	duplicateListingRow,
	trashListingRows,
	restoreListingRows,
	deleteListingRows,
	onSaveAsPresetUpsell,
}) {
	const [pendingConfirm, setPendingConfirm] = useState(
		/** @type {'trash'|'delete-permanently'|null} */ (null)
	);
	const [confirmBusy, setConfirmBusy] = useState(false);
	const actions = getListingRowHoverActions(item, {
		canUseBulkEditor,
		showSaveAsPresetUpsell: typeof onSaveAsPresetUpsell === 'function',
	});

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
			case 'duplicate':
				if (typeof duplicateListingRow === 'function') {
					void duplicateListingRow(item);
				}
				break;
			case 'bulk-editor':
				openListingBulkEditor(item.id);
				break;
			case 'save-as-preset':
				onSaveAsPresetUpsell();
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

	return (
		<>
			{actions.length > 0 ? (
				// Pointer or focus on the shortcuts closes the cover's preview.
				// eslint-disable-next-line jsx-a11y/no-static-element-interactions
				<span
					className="modula-content-page__row-hover-actions"
					onMouseEnter={closeListingRowPreview}
					onFocus={closeListingRowPreview}
				>
					{actions.map((action, index) => (
						<Fragment key={action.id}>
							{index > 0 ? (
								<span
									className="modula-content-page__row-hover-sep"
									aria-hidden="true"
								>
									|
								</span>
							) : null}
							<button
								data-quick-edit-key={
									action.id === 'quick-edit'
										? `${item.type}-${item.id}`
										: undefined
								}
								type="button"
								className={[
									'modula-content-page__row-hover-action',
									action.isDestructive
										? 'is-destructive'
										: '',
								]
									.filter(Boolean)
									.join(' ')}
								onClick={(event) => {
									event.preventDefault();
									runAction(action.id);
								}}
							>
								{action.label}
								{action.isUpsell ? (
									<>
										<span className="modula-admin-sr-only">
											{__(
												', PRO',
												'modula-best-grid-gallery'
											)}
										</span>
										<LockIcon />
									</>
								) : null}
							</button>
						</Fragment>
					))}
				</span>
			) : null}
			{pendingConfirm ? (
				<ConfirmDialog
					open
					busy={confirmBusy}
					cancelOnOutsideClick
					title={getListingDestructiveConfirmTitle(pendingConfirm)}
					message={getListingDestructiveConfirmMessage(
						pendingConfirm,
						item
					)}
					confirmLabel={getListingDestructiveConfirmButtonLabel(
						pendingConfirm,
						item
					)}
					onConfirm={() => {
						void confirmDestructiveAction();
					}}
					onCancel={cancelDestructiveConfirm}
				/>
			) : null}
		</>
	);
}
