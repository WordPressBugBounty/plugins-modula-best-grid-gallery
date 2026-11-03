import { useMemo, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Button, ConfirmDialog } from 'admin-ui';
import { getListingBulkBarActions } from './listingBulkBar';

/**
 * Listing bulk bar in the listing toolbar for the current listing selection.
 *
 * Lifecycle + Convert to new editor (galleries). Apply preset is catalogued when
 * entitled and rendered only when onApplyPreset is provided (Pro Defaults).
 *
 * @param {Object}                                     props
 * @param {string[]}                                   props.selection
 * @param {Object[]}                                   props.pageRows
 * @param {boolean}                                    [props.canUseApplyPreset]
 * @param {(items: Object[]) => Promise<unknown>}      [props.trashListingRows]
 * @param {(items: Object[]) => Promise<unknown>}      [props.restoreListingRows]
 * @param {(items: Object[]) => Promise<unknown>}      [props.deleteListingRows]
 * @param {(items: Object[]) => void|Promise<unknown>} [props.onApplyPreset]
 * @param {(items: Object[]) => void|Promise<unknown>} [props.onConvertToNewEditor]
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
	onConvertToNewEditor,
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
			if (action.id === 'convert-new-editor') {
				return typeof onConvertToNewEditor === 'function';
			}
			return true;
		});
	}, [
		selection,
		pageRows,
		canUseApplyPreset,
		onApplyPreset,
		onConvertToNewEditor,
	]);

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
			} else if (
				pendingAction.id === 'convert-new-editor' &&
				typeof onConvertToNewEditor === 'function'
			) {
				await onConvertToNewEditor(pendingAction.items);
				setPendingAction(null);
				return;
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
				className="modula-content-page__bulk-bar"
				role="toolbar"
				aria-label={__('Listing selection', 'modula-best-grid-gallery')}
			>
				{actions.map((action) => (
					<Button
						key={action.id}
						className={[
							'modula-content-page__bulk-bar-action',
							`modula-content-page__bulk-bar-action--${action.id}`,
							action.isDestructive ? 'is-destructive' : '',
						]
							.filter(Boolean)
							.join(' ')}
						variant="secondary"
						aria-busy={actionBusyId === action.id || undefined}
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
			{pendingAction ? (
				<ConfirmDialog
					open
					busy={confirmBusy}
					cancelOnOutsideClick
					// Convert removes nothing: it backs up and switches editors.
					confirmVariant={
						pendingAction.isDestructive ? 'danger' : 'primary'
					}
					title={pendingAction.confirmTitle || ''}
					message={pendingAction.confirmMessage || ''}
					confirmLabel={pendingAction.confirmButtonLabel || ''}
					onConfirm={() => {
						void confirmPending();
					}}
					onCancel={cancelConfirm}
				/>
			) : null}
		</>
	);
}
