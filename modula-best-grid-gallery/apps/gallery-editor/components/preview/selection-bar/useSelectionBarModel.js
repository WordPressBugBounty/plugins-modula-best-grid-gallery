/**
 * Selection-bar data: selected rows, filter tri-state, bulk filter persist.
 */
import {
	asGalleryItemList,
} from 'gallery-shared/preview';
import { useCallback, useEffect, useMemo, useState } from '@wordpress/element';
import { useGallerySettingsFormBundle } from '../../../form/GallerySettingsFormContext';
import { useGalleryPreviewTileSelection } from '../../../context/GalleryPreviewTileSelectionContext';
import { usePreviewReduxStoreItems } from '../../../hooks/usePreviewReduxStoreItems';
import { useTakeoverSaveStatus } from '../../../context/TakeoverSaveStatusContext';
import { getGalleryPreviewReduxStore } from '../../../utils/previewReduxStoreRef';
import { saveMergedGalleryItems } from '../../../api/galleryUploadApi';
import { commitPreviewCatalog } from '../../../utils/previewItemsCommit';
import {
	isEmbeddedGalleryItemRow,
	previewCoreItemsToSaveMergedPayload,
	reanchorEmbeddedRowsInMergedList,
} from '../../../utils/embeddedGalleryItems';
import {
	bulkEditRowKey,
	filtersFieldToString,
	galleryFilterSuggestions,
	parseFiltersField,
} from '../../bulk-edit/bulkEditUtils';
import { mergeTagsIntoGalleryFilterSettings } from '../../bulk-edit/bulkEditSave';

/**
 * @typedef {'none' | 'partial' | 'all'} FilterTriState
 */

/**
 * @param {Record<string, unknown>|undefined|null} wm
 * @return {string}
 */
function resolveWatermarkSummary(wm) {
	const type = String(wm?.watermarkType || 'none');
	if (type === 'text') {
		const text = String(wm?.watermarkText || '').trim();
		return text || 'Text';
	}
	if (type === 'image') {
		return 'Image';
	}
	return 'None';
}

/**
 * @param {{
 *   galleryId?: number,
 *   runPreviewItemMutation?: (task: () => void | Promise<void>) => Promise<void>,
 * }} args
 */
export function useSelectionBarModel({
	galleryId = 0,
	runPreviewItemMutation,
}) {
	const tileSelection = useGalleryPreviewTileSelection();
	const { form } = useGallerySettingsFormBundle();
	const { runPersistTask } = useTakeoverSaveStatus();
	const persist = runPreviewItemMutation ?? runPersistTask;
	const items = usePreviewReduxStoreItems(
		Boolean(tileSelection?.hasSelection)
	);
	const [filterBusy, setFilterBusy] = useState(false);
	const [galleryFilterNames, setGalleryFilterNames] = useState(() =>
		galleryFilterSuggestions(form.state.values?.filters?.filters)
	);
	const [watermarkSummary, setWatermarkSummary] = useState(() =>
		resolveWatermarkSummary(form.state.values?.watermark)
	);

	useEffect(() => {
		const sync = () => {
			const values = form.store.state.values;
			setGalleryFilterNames(
				galleryFilterSuggestions(values?.filters?.filters)
			);
			setWatermarkSummary(resolveWatermarkSummary(values?.watermark));
		};
		sync();
		return form.store.subscribe(sync);
	}, [form.store]);

	const selectedStoreIndices = tileSelection?.selectedStoreIndices ?? [];

	const selectedRows = useMemo(() => {
		if (!Array.isArray(items) || selectedStoreIndices.length === 0) {
			return [];
		}
		const out = [];
		for (const idx of selectedStoreIndices) {
			const row = items[idx];
			if (row && !isEmbeddedGalleryItemRow(row)) {
				out.push({ storeIndex: idx, row });
			}
		}
		return out;
	}, [items, selectedStoreIndices]);

	const selectedCount = selectedRows.length;

	const attachmentIds = useMemo(() => {
		const ids = [];
		const seen = new Set();
		for (const { row } of selectedRows) {
			const id = Number(row?.id);
			if (Number.isFinite(id) && id > 0 && !seen.has(id)) {
				seen.add(id);
				ids.push(id);
			}
		}
		return ids;
	}, [selectedRows]);

	/**
	 * @param {string} tag
	 * @return {{ state: FilterTriState, hitCount: number }}
	 */
	const getFilterState = useCallback(
		(tag) => {
			const t = String(tag).trim();
			if (!t || selectedRows.length === 0) {
				return {
					state: /** @type {FilterTriState} */ ('none'),
					hitCount: 0,
				};
			}
			let hit = 0;
			for (const { row } of selectedRows) {
				if (parseFiltersField(row.filters).includes(t)) {
					hit += 1;
				}
			}
			if (hit === 0) {
				return { state: 'none', hitCount: 0 };
			}
			if (hit === selectedRows.length) {
				return { state: 'all', hitCount: hit };
			}
			return { state: 'partial', hitCount: hit };
		},
		[selectedRows]
	);

	const persistFiltersOnSelection = useCallback(
		async (
			/** @type {(tokens: string[]) => string[]} */ transformTokens
		) => {
			const store = getGalleryPreviewReduxStore();
			if (!store || !galleryId || selectedRows.length === 0) {
				return;
			}
			/** @type {Record<string, Record<string, unknown>>} */
			const localChanges = {};
			/** @type {string[]} */
			const newTags = [];
			for (const { row } of selectedRows) {
				const key = bulkEditRowKey(row);
				if (!key) {
					continue;
				}
				const prev = parseFiltersField(row.filters);
				const next = transformTokens(prev);
				const nextStr = filtersFieldToString(next);
				if (nextStr !== filtersFieldToString(prev)) {
					localChanges[key] = { filters: nextStr };
				}
				for (const t of next) {
					if (!prev.includes(t)) {
						newTags.push(t);
					}
				}
			}
			if (Object.keys(localChanges).length === 0) {
				return;
			}

			setFilterBusy(true);
			try {
				await persist(async () => {
					const sourceItems = asGalleryItemList(
						store.getState().items.items
					);
					const merged = sourceItems.map((row) => {
						if (isEmbeddedGalleryItemRow(row)) {
							return { ...row };
						}
						const key = bulkEditRowKey(row);
						const patch = key ? localChanges[key] : undefined;
						if (!patch) {
							return { ...row };
						}
						return { ...row, ...patch };
					});
					const payload = reanchorEmbeddedRowsInMergedList(
						previewCoreItemsToSaveMergedPayload(merged)
					);
					await saveMergedGalleryItems(galleryId, payload);
					mergeTagsIntoGalleryFilterSettings(form, newTags);
					commitPreviewCatalog(store, payload);
				});
			} finally {
				setFilterBusy(false);
			}
		},
		[form, galleryId, persist, selectedRows]
	);

	const toggleFilterOnSelection = useCallback(
		async (tag) => {
			const t = String(tag).trim();
			if (!t) {
				return;
			}
			const { state } = getFilterState(t);
			if (state === 'all') {
				await persistFiltersOnSelection((tokens) =>
					tokens.filter((x) => x !== t)
				);
			} else {
				await persistFiltersOnSelection((tokens) =>
					tokens.includes(t) ? tokens : [...tokens, t]
				);
			}
		},
		[getFilterState, persistFiltersOnSelection]
	);

	const addNewFilterToSelection = useCallback(
		async (name) => {
			const t = String(name).trim();
			if (!t) {
				return;
			}
			await persistFiltersOnSelection((tokens) =>
				tokens.includes(t) ? tokens : [...tokens, t]
			);
		},
		[persistFiltersOnSelection]
	);

	return {
		tileSelection,
		hasSelection: Boolean(tileSelection?.hasSelection),
		selectedCount,
		selectedRows,
		selectedStoreIndices,
		attachmentIds,
		galleryFilterNames,
		watermarkSummary,
		getFilterState,
		toggleFilterOnSelection,
		addNewFilterToSelection,
		filterBusy,
		exitMode: () => tileSelection?.exitMode?.(),
	};
}
