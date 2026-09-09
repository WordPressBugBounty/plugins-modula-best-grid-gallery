/**
 * Gallery filter names as chips (count + dismiss) with add affordance.
 */

import {
	asGalleryItemList,
} from 'gallery-shared/preview';
import { __, sprintf } from '@wordpress/i18n';
import { useMemo, useState } from '@wordpress/element';
import { Button, Chip, TextInput } from 'shared-ui';
import { usePreviewReduxStoreItems } from '../../hooks/usePreviewReduxStoreItems';
import { buildFilterImageUsageCounts } from '../../utils/filterImageUsageCounts';
import { getGalleryPreviewReduxStore } from '../../utils/previewReduxStoreRef';
import { getModulaSettingsEditorConfig } from '../../config/modulaSettingsEditorConfig';
import { resolveGalleryAdminPostId } from '../../utils/resolveGalleryAdminPostId';
import { useGalleryBootstrapQuery } from '../../query/useGalleryBootstrapQuery';
import { commitPreviewCatalog } from '../../utils/previewItemsCommit';
import {
	normalizeGalleryFilterNames,
	stripOrphanedImageFiltersFromCoreItems,
	stripRemovedImageFiltersFromCoreItems,
} from '../../utils/syncImageFiltersWithGalleryFilterList';

const FILTER_LIST_HELPER = __(
	'The number is how many images carry that filter. Empty filters will not show up in the bar.',
	'modula-best-grid-gallery'
);

/**
 * @param {unknown} value
 * @return {string[]}
 */
function normalizeFilterList(value) {
	if (!Array.isArray(value)) {
		return [];
	}
	return value.map((x) => String(x));
}

/**
 * @param {string[]} list
 * @return {boolean}
 */
function isEmptyFilterList(list) {
	return list.length === 0;
}

/**
 * @param {Object}   props
 * @param {unknown}  props.value    `filters.filters` — string[]
 * @param {Function} props.onChange
 * @param {boolean}  props.disabled
 * @param {string}   [props.help]
 */
export default function FilterNameListControl({
	value,
	onChange,
	disabled,
	help,
}) {
	const list = normalizeFilterList(value);
	const showEmptyState = isEmptyFilterList(list);
	const [editingIndex, setEditingIndex] = useState(
		/** @type {number|null} */ (null)
	);

	const previewItems = usePreviewReduxStoreItems();
	const editorConfig = getModulaSettingsEditorConfig();
	const galleryId = resolveGalleryAdminPostId(editorConfig);
	const { data: bootstrap } = useGalleryBootstrapQuery(galleryId);
	const itemsForUsageCounts =
		previewItems.length > 0
			? previewItems
			: Array.isArray(bootstrap?.items)
				? bootstrap.items
				: [];
	const usageByFilter = useMemo(
		() => buildFilterImageUsageCounts(itemsForUsageCounts),
		[itemsForUsageCounts]
	);

	const syncRemovedFiltersOnImages = (removedNames) => {
		if (!removedNames.length) {
			return;
		}
		const store = getGalleryPreviewReduxStore();
		if (!store) {
			return;
		}
		const core = asGalleryItemList(store.getState().items.items);
		const { items: nextCore, changed } =
			stripRemovedImageFiltersFromCoreItems(core, removedNames);
		if (changed) {
			commitPreviewCatalog(store, nextCore);
		}
	};

	const syncImageFiltersToGalleryList = () => {
		const store = getGalleryPreviewReduxStore();
		if (!store) {
			return;
		}
		const galleryFilterNames = normalizeGalleryFilterNames(list);
		const core = asGalleryItemList(store.getState().items.items);
		const { items: nextCore, changed } =
			stripOrphanedImageFiltersFromCoreItems(core, galleryFilterNames);
		if (changed) {
			commitPreviewCatalog(store, nextCore);
		}
	};

	const commit = (next, { syncImages = true } = {}) => {
		const normalized = normalizeFilterList(next);
		const prevNames = normalizeGalleryFilterNames(list);
		const nextNames = normalizeGalleryFilterNames(normalized);
		const removedNames = prevNames.filter(
			(name) => !nextNames.includes(name)
		);

		onChange(isEmptyFilterList(normalized) ? [] : normalized);

		if (syncImages) {
			syncRemovedFiltersOnImages(removedNames);
		}
	};

	const updateAt = (index, raw) => {
		const next = [...list];
		next[index] = raw;
		commit(next, { syncImages: false });
	};

	const addRow = () => {
		const next = [...list, ''];
		commit(next, { syncImages: false });
		setEditingIndex(next.length - 1);
	};

	const removeAt = (index) => {
		if (editingIndex === index) {
			setEditingIndex(null);
		} else if (editingIndex !== null && editingIndex > index) {
			setEditingIndex(editingIndex - 1);
		}
		commit(list.filter((_, j) => j !== index));
	};

	const helperText =
		typeof help === 'string' && help.trim() !== ''
			? help
			: FILTER_LIST_HELPER;

	return (
		<div className="modula-settings-editor__filter-name-list modula-settings-editor__filter-name-list--chips">
			{showEmptyState ? (
				<div
					className="modula-settings-editor__filter-name-list-empty"
					role="status"
				>
					<p className="modula-settings-editor__filter-name-list-empty-title">
						{__('No filters yet.', 'modula-best-grid-gallery')}
					</p>
					<p className="modula-settings-editor__filter-name-list-empty-desc">
						{__(
							'Add filters to let visitors narrow images by category.',
							'modula-best-grid-gallery'
						)}
					</p>
				</div>
			) : (
				<div
					className="modula-settings-editor__filter-name-list-chips"
					role="list"
					aria-label={__(
						'Gallery filter labels',
						'modula-best-grid-gallery'
					)}
				>
					{list.map((row, i) => {
						const label = String(row).trim();
						const imageCount = label
							? (usageByFilter.get(label) ?? 0)
							: 0;
						const isEditing = editingIndex === i;

						if (isEditing) {
							return (
								<div
									key={`filter-edit-${i}`}
									className="modula-settings-editor__filter-name-list-chip-edit"
									role="listitem"
								>
									<TextInput
										value={row}
										disabled={disabled}
										autoFocus
										aria-label={__(
											'Filter name',
											'modula-best-grid-gallery'
										)}
										placeholder={__(
											'Filter name',
											'modula-best-grid-gallery'
										)}
										onChange={(v) => updateAt(i, v)}
										onBlur={() => {
											setEditingIndex(null);
											syncImageFiltersToGalleryList();
										}}
										onKeyDown={(event) => {
											if (event.key === 'Enter') {
												event.preventDefault();
												setEditingIndex(null);
												syncImageFiltersToGalleryList();
											}
											if (event.key === 'Escape') {
												event.preventDefault();
												setEditingIndex(null);
											}
										}}
									/>
								</div>
							);
						}

						return (
							<span
								key={`filter-chip-${i}`}
								className="modula-settings-editor__filter-name-list-chip-wrap"
								role="listitem"
							>
								<Chip
									count={imageCount}
									disabled={disabled}
									dismissLabel={
										label
											? sprintf(
													/* translators: %s: filter label */
													__(
														'Remove filter %s',
														'modula-best-grid-gallery'
													),
													label
												)
											: __(
													'Remove filter',
													'modula-best-grid-gallery'
												)
									}
									onClick={
										disabled
											? undefined
											: () => setEditingIndex(i)
									}
									onDismiss={
										disabled ? undefined : () => removeAt(i)
									}
								>
									{label ||
										__(
											'Filter name',
											'modula-best-grid-gallery'
										)}
								</Chip>
							</span>
						);
					})}
					<Button
						type="button"
						variant="ghost"
						mini
						className="modula-settings-editor__filter-name-list-add-chip"
						disabled={disabled}
						onClick={addRow}
					>
						{__('+ New filter', 'modula-best-grid-gallery')}
					</Button>
				</div>
			)}
			{showEmptyState ? (
				<Button
					type="button"
					variant="ghost"
					mini
					className="modula-settings-editor__filter-name-list-add-chip"
					disabled={disabled}
					onClick={addRow}
				>
					{__('+ New filter', 'modula-best-grid-gallery')}
				</Button>
			) : null}
			<p className="modula-settings-editor__filter-name-list-help">
				{helperText}
			</p>
		</div>
	);
}
