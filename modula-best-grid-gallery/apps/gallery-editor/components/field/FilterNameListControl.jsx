/**
 * Gallery filter names: editor-shell's filter name list, counting the images
 * that carry each filter and keeping the images' tags in step with the list
 * (canvas).
 */

import { asGalleryItemList } from 'gallery-shared/preview';
import { __, _n, sprintf } from '@wordpress/i18n';
import { useMemo } from '@wordpress/element';
import { FilterNameListControl as FilterNameList } from 'editor-shell';
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

/**
 * @param {string} name  Filter name.
 * @param {number} count Images that carry it.
 * @return {string} Names a chip's rename button.
 */
function renameLabel(name, count) {
	return sprintf(
		/* translators: 1: filter label, 2: number of images with it. */
		_n(
			'Rename filter %1$s (%2$d image)',
			'Rename filter %1$s (%2$d images)',
			count,
			'modula-best-grid-gallery'
		),
		name,
		count
	);
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
	const previewItems = usePreviewReduxStoreItems();
	const editorConfig = getModulaSettingsEditorConfig();
	const galleryId = resolveGalleryAdminPostId(editorConfig);
	const { data: bootstrap } = useGalleryBootstrapQuery(galleryId);
	const usageByFilter = useMemo(() => {
		if (previewItems.length > 0) {
			return buildFilterImageUsageCounts(previewItems);
		}
		return buildFilterImageUsageCounts(
			Array.isArray(bootstrap?.items) ? bootstrap.items : []
		);
	}, [previewItems, bootstrap]);

	const syncRemovedFiltersOnImages = (removedNames) => {
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
		const galleryFilterNames = normalizeGalleryFilterNames(value);
		const core = asGalleryItemList(store.getState().items.items);
		const { items: nextCore, changed } =
			stripOrphanedImageFiltersFromCoreItems(core, galleryFilterNames);
		if (changed) {
			commitPreviewCatalog(store, nextCore);
		}
	};

	return (
		<FilterNameList
			value={value}
			onChange={onChange}
			disabled={disabled}
			help={help}
			usageByFilter={usageByFilter}
			listLabel={__('Gallery filter labels', 'modula-best-grid-gallery')}
			renameLabel={renameLabel}
			onNamesRemoved={syncRemovedFiltersOnImages}
			onRenameDone={syncImageFiltersToGalleryList}
		/>
	);
}
