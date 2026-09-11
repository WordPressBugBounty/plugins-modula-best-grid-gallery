import { useMemo, useState } from '@wordpress/element';
import {
	Button,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis -- same ConfirmDialog as Clear trash / row actions
	__experimentalConfirmDialog as ConfirmDialog,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { getListingBulkBarActions } from './listingBulkBar';

/**
 * Listing bulk bar in the listing toolbar for the current listing selection.
 *
 * Lifecycle only in this ticket; Apply preset is catalogued when entitled and
 * rendered only when onApplyPreset is provided (Pro Defaults, ticket 04).
 *
 * @param {Object}                                     props
 * @param {string[]}                                   props.selection
 * @param {Object[]}                                   props.pageRows
 * @param {boolean}                                    [props.canUseApplyPreset]
 * @param {(items: Object[]) => Promise<unknown>}      [props.trashListingRows]
 * @param {(items: Object[]) => Promise<unknown>}      [props.restoreListingRows]
 * @param {(items: Object[]) => Promise<unknown>}      [props.deleteListingRows]
 * @param {(items: Object[]) => void|Promise<unknown>} [props.onApplyPreset]
 * @param {() => void}                                 [props.onSelectionCleared]
 */
export function ListingSelectionBulkBar({
	selection,
	pageRows,
	canUseApplyPreset = false,
	trashListingRows,
	restoreListingRows,
	deleteListingRows,
	onApplyPreset,
	onSelectionCleared,
}) {
	const [pendingAction, setPendingAction] = useState(
		/** @type {import('./listingBulkBar').ListingBulkBarAction|null} */ (
			null
		)
	);
	const [confirmBusy, setConfirmBusy] = useState(false);
	const [actionBusyId, setActionBusyId] = useState(
		/** @type {string|null} */ (null)
	);

	const actions = useMemo(() => {
		const catalog = getListingBulkBarActions({
			selection,
			pageRows,
			canUseApplyPreset,
		});
		return catalog.filter((action) => {
			if (action.id === 'apply-preset') {
				return typeof onApplyPreset === 'function';
			}
			return true;
		});
	}, [selection, pageRows, canUseApplyPreset, onApplyPreset]);

	if (actions.length === 0) {
		return null;
	}

	const runWithoutConfirm = async (action) => {
		if (actionBusyId || pendingAction || action.disabled) {
			return;
		}
		setActionBusyId(action.id);
		try {
			if (
				action.id === 'restore' &&
				typeof restoreListingRows === 'function'
			) {
				await restoreListingRows(action.items);
			} else if (
				action.id === 'apply-preset' &&
				typeof onApplyPreset === 'function'
			) {
				await onApplyPreset(action.items);
				return;
			}
			if (typeof onSelectionCleared === 'function') {
				onSelectionCleared();
			}
		} catch (e) {
			// Toast comes later.
		} finally {
			setActionBusyId(null);
		}
	};

	const openConfirm = (action) => {
		if (actionBusyId || pendingAction || confirmBusy || action.disabled) {
			return;
		}
		setPendingAction(action);
	};

	const cancelConfirm = () => {
		if (confirmBusy) {
			return;
		}
		setPendingAction(null);
	};

	const confirmPending = async () => {
		if (!pendingAction || confirmBusy) {
			return;
		}
		setConfirmBusy(true);
		try {
			if (
				pendingAction.id === 'trash' &&
				typeof trashListingRows === 'function'
			) {
				await trashListingRows(pendingAction.items);
			} else if (
				pendingAction.id === 'delete-permanently' &&
				typeof deleteListingRows === 'function'
			) {
				await deleteListingRows(pendingAction.items);
			}
			setPendingAction(null);
			if (typeof onSelectionCleared === 'function') {
				onSelectionCleared();
			}
		} catch (e) {
			// Keep the dialog open; toast comes later.
		} finally {
			setConfirmBusy(false);
		}
	};

	const busy = Boolean(actionBusyId) || confirmBusy;

	return (
		<>
			<div
				className="modula-gallery-listing__bulk-bar"
				role="toolbar"
				aria-label={__('Listing selection', 'modula-best-grid-gallery')}
			>
				{actions.map((action) => (
					<Button
						key={action.id}
						className={`modula-gallery-listing__bulk-bar-action modula-gallery-listing__bulk-bar-action--${action.id}`}
						variant="secondary"
						isDestructive={Boolean(action.isDestructive)}
						isBusy={actionBusyId === action.id}
						disabled={busy || Boolean(action.disabled)}
						title={
							action.disabled && action.disabledReason
								? action.disabledReason
								: undefined
						}
						onClick={() => {
							if (action.disabled) {
								return;
							}
							if (action.requiresConfirm) {
								openConfirm(action);
								return;
							}
							void runWithoutConfirm(action);
						}}
					>
						{action.label}
					</Button>
				))}
			</div>
			<ConfirmDialog
				isOpen={Boolean(pendingAction)}
				isBusy={confirmBusy}
				confirmButtonText={
					pendingAction?.confirmButtonLabel || undefined
				}
				onConfirm={() => {
					void confirmPending();
				}}
				onCancel={cancelConfirm}
			>
				{pendingAction?.confirmMessage || null}
			</ConfirmDialog>
		</>
	);
}
