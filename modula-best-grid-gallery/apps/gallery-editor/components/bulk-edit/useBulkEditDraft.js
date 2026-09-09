import { useCallback, useMemo, useState } from '@wordpress/element';
import { bulkEditHasDraftChanges } from './bulkEditSave';
import { bulkEditRowKey } from './bulkEditUtils';

/**
 * Local draft state for bulk edit modal.
 *
 * @param {import('@reduxjs/toolkit').Store|null} previewStore
 * @param {unknown}                               storeRevision Bumps when preview items change (e.g. after save).
 */
export function useBulkEditDraft(previewStore, storeRevision = 0) {
	const [localChanges, setLocalChanges] = useState(
		/** @type {Record<string, Record<string, unknown>>} */ ({})
	);
	const [selectedIds, setSelectedIds] = useState(
		/** @type {string[]} */ ([])
	);

	const hasChanges = useMemo(
		() => bulkEditHasDraftChanges(localChanges, previewStore),
		[localChanges, previewStore, storeRevision]
	);

	const resetDraft = useCallback(() => {
		setLocalChanges({});
		setSelectedIds([]);
	}, []);

	const patchRow = useCallback((rowOrId, patch) => {
		const key = bulkEditRowKey(rowOrId);
		if (!key) {
			return;
		}
		setLocalChanges((prev) => ({
			...prev,
			[key]: {
				...(prev[key] || {}),
				...patch,
			},
		}));
	}, []);

	const getRowField = useCallback(
		(row, field) => {
			const key = bulkEditRowKey(row);
			const draft = key ? localChanges[key] : undefined;
			if (draft && Object.prototype.hasOwnProperty.call(draft, field)) {
				return draft[field];
			}
			return row?.[field];
		},
		[localChanges]
	);

	const toggleSelected = useCallback((rowOrId, checked) => {
		const key = bulkEditRowKey(rowOrId);
		if (!key) {
			return;
		}
		setSelectedIds((prev) =>
			checked ? [...prev, key] : prev.filter((id) => id !== key)
		);
	}, []);

	const toggleAllSelected = useCallback((rowKeys, checked) => {
		setSelectedIds(checked ? [...rowKeys] : []);
	}, []);

	const clearRowDraft = useCallback((rowOrId) => {
		const key = bulkEditRowKey(rowOrId);
		if (!key) {
			return;
		}
		setLocalChanges((prev) => {
			if (!prev[key]) {
				return prev;
			}
			const next = { ...prev };
			delete next[key];
			return next;
		});
		setSelectedIds((prev) => prev.filter((id) => id !== key));
	}, []);

	return {
		localChanges,
		selectedIds,
		selectedCount: selectedIds.length,
		hasChanges,
		resetDraft,
		patchRow,
		getRowField,
		toggleSelected,
		toggleAllSelected,
		clearRowDraft,
	};
}
