import { useState } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';
import { Button, ConfirmDialog } from 'admin-ui';
import {
	fetchAllTrashListingRows,
	filterDeletableTrashRows,
	getClearTrashConfirmButtonLabel,
	getClearTrashConfirmMessage,
	getClearTrashConfirmTitle,
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

	return (
		<>
			<Button
				className="modula-content-page__clear-trash"
				variant="secondary"
				aria-haspopup="dialog"
				disabled={prepareBusy || confirmBusy}
				onClick={() => {
					void openConfirm();
				}}
			>
				{getClearTrashConfirmButtonLabel()}
			</Button>
			{pendingRows ? (
				<ConfirmDialog
					open
					busy={confirmBusy}
					cancelOnOutsideClick
					title={getClearTrashConfirmTitle()}
					message={getClearTrashConfirmMessage(pendingRows.length)}
					confirmLabel={getClearTrashConfirmButtonLabel()}
					onConfirm={() => {
						void confirmClearTrash();
					}}
					onCancel={cancelConfirm}
				/>
			) : null}
		</>
	);
}
