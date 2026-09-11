import { useState } from '@wordpress/element';
import {
	Button,
	__experimentalConfirmDialog as ConfirmDialog,
} from '@wordpress/components';
import apiFetch from '@wordpress/api-fetch';
import {
	fetchAllTrashListingRows,
	filterDeletableTrashRows,
	getClearTrashConfirmButtonLabel,
	getClearTrashConfirmMessage,
} from './listingClearTrash';

/**
 * Clear trash control beside listing search.
 *
 * @param {Object}                                props
 * @param {(items: Object[]) => Promise<unknown>} props.deleteListingRows
 */
export function ListingClearTrashButton({ deleteListingRows }) {
	const [pendingRows, setPendingRows] = useState(
		/** @type {Object[]|null} */ (null)
	);
	const [prepareBusy, setPrepareBusy] = useState(false);
	const [confirmBusy, setConfirmBusy] = useState(false);

	const openConfirm = async () => {
		if (prepareBusy || confirmBusy || pendingRows) {
			return;
		}

		setPrepareBusy(true);
		try {
			const rows = await fetchAllTrashListingRows(apiFetch);
			const deletable = filterDeletableTrashRows(rows);
			if (deletable.length === 0) {
				return;
			}
			setPendingRows(deletable);
		} catch (e) {
			// Toast comes later.
		} finally {
			setPrepareBusy(false);
		}
	};

	const cancelConfirm = () => {
		if (confirmBusy) {
			return;
		}
		setPendingRows(null);
	};

	const confirmClearTrash = async () => {
		if (!pendingRows || confirmBusy) {
			return;
		}

		setConfirmBusy(true);
		try {
			if (typeof deleteListingRows === 'function') {
				await deleteListingRows(pendingRows);
			}
			setPendingRows(null);
		} catch (e) {
			// Keep the dialog open; toast comes later.
		} finally {
			setConfirmBusy(false);
		}
	};

	const count = pendingRows?.length ?? 0;

	return (
		<>
			<Button
				className="modula-gallery-listing__clear-trash"
				variant="secondary"
				isDestructive
				isBusy={prepareBusy}
				disabled={prepareBusy || confirmBusy}
				onClick={() => {
					void openConfirm();
				}}
			>
				{getClearTrashConfirmButtonLabel()}
			</Button>
			<ConfirmDialog
				isOpen={Boolean(pendingRows)}
				isBusy={confirmBusy}
				confirmButtonText={getClearTrashConfirmButtonLabel()}
				onConfirm={() => {
					void confirmClearTrash();
				}}
				onCancel={cancelConfirm}
			>
				{pendingRows ? getClearTrashConfirmMessage(count) : null}
			</ConfirmDialog>
		</>
	);
}
