/**
 * Adding and replacing images as unsaved changes (ADR 0059, explicit-save
 * ticket 11). The item-rows route builds the rows on the server and stores
 * nothing; the items go into the preview store at once, as one history step,
 * and the items part of the editor save session stores them on Save. A failed
 * route call changes nothing.
 *
 * @package
 */

import { _n } from '@wordpress/i18n';
import {
	applyVideoPosterFieldsToPreviewItem,
	asGalleryItemList,
	storeIndexToCoreIndex,
} from 'gallery-shared/preview';
import { fetchGalleryItemRows } from '../api/galleryItemRowsApi';
import {
	insertAddedItems,
	insertBuiltItems,
	replaceItemsInCatalog,
} from './galleryItemAddReplace';
import { reanchorEmbeddedRowsInMergedList } from './embeddedGalleryItems';
import {
	commitPreviewCatalog,
	mergeModulaRowIntoPreviewItem,
} from './previewItemsCommit';

/**
 * @typedef {import('../api/galleryItemRowsApi').GalleryTileLayout} GalleryTileLayout
 * @typedef {(args: { label: string, change: unknown }) => number} CommitItemsStep
 */

/**
 * The layout new rows are built for: the settings form's working values, which
 * may not be saved yet (Custom grid default spans follow them).
 *
 * @param {Object} formValues Grouped settings form values.
 * @return {GalleryTileLayout} Layout type and grid column count.
 */
export function workingTileLayout(formValues) {
	return {
		type: formValues?.general?.type,
		columns: formValues?.layout?.gridType,
	};
}

/**
 * @param {import('@reduxjs/toolkit').Store} store
 * @return {Object[]} The store's catalog without page breaks.
 */
function readCatalog(store) {
	return asGalleryItemList(store.getState().items.items);
}

/**
 * Add attachments to the gallery at the insert position.
 *
 * @param {{
 *   store: import('@reduxjs/toolkit').Store,
 *   galleryId: number,
 *   attachmentIds: number[],
 *   position: 'start'|'end',
 *   layout: GalleryTileLayout,
 *   commitItemsStep: CommitItemsStep,
 * }} args
 * @return {Promise<number>} How many items were added (attachments already in the gallery are skipped).
 */
export async function addAttachmentsToPreviewCatalog({
	store,
	galleryId,
	attachmentIds,
	position,
	layout,
	commitItemsStep,
}) {
	const entries = await fetchGalleryItemRows(
		galleryId,
		attachmentIds,
		layout
	);
	const added = insertAddedItems(
		readCatalog(store),
		entries.map((entry) => entry.item),
		position
	);
	if (!added) {
		return 0;
	}
	commitPreviewCatalog(
		store,
		reanchorEmbeddedRowsInMergedList(added.catalog)
	);
	const count = added.change.rows.length;
	commitItemsStep({
		label: _n('Add image', 'Add images', count, 'modula-best-grid-gallery'),
		change: added.change,
	});
	return count;
}

/**
 * Add rows an extension built in the browser (Pro video rows) at the insert
 * position, as one history step. A video row gets its poster as the tile
 * image, which the bootstrap would otherwise derive after a reload.
 *
 * @param {{
 *   store: import('@reduxjs/toolkit').Store,
 *   items: Object[],
 *   position: 'start'|'end',
 *   label: string,
 *   commitItemsStep: CommitItemsStep,
 * }} args
 * @return {number} How many rows were added.
 */
export function addBuiltItemsToPreviewCatalog({
	store,
	items,
	position,
	label,
	commitItemsStep,
}) {
	const added = insertBuiltItems(
		readCatalog(store),
		items.map((item) => applyVideoPosterFieldsToPreviewItem(item)),
		position
	);
	if (!added) {
		return 0;
	}
	commitPreviewCatalog(
		store,
		reanchorEmbeddedRowsInMergedList(added.catalog)
	);
	commitItemsStep({ label, change: added.change });
	return added.change.rows.length;
}

/**
 * Replace images at store positions. Each new row merges into the old tile
 * as the stored replace did (`mergeModulaRowIntoPreviewItem`): the position
 * stays, the new row's fields win, keys it lacks are kept. A tile that
 * changed while the route answered is left alone.
 *
 * @param {{
 *   store: import('@reduxjs/toolkit').Store,
 *   galleryId: number,
 *   replacements: { storeIndex: number, attachmentId: number }[],
 *   layout: GalleryTileLayout,
 *   commitItemsStep: CommitItemsStep,
 * }} args
 * @return {Promise<number>} How many tiles were replaced.
 */
export async function replaceAttachmentsInPreviewCatalog({
	store,
	galleryId,
	replacements,
	layout,
	commitItemsStep,
}) {
	const items = store.getState().items.items;
	const catalogBefore = asGalleryItemList(items);
	const targets = replacements
		.map(({ storeIndex, attachmentId }) => {
			const coreIndex = storeIndexToCoreIndex(items, storeIndex);
			return {
				coreIndex,
				before: catalogBefore[coreIndex],
				attachmentId,
			};
		})
		.filter((target) => target.coreIndex >= 0 && target.before);
	if (targets.length === 0) {
		return 0;
	}

	const entries = await fetchGalleryItemRows(
		galleryId,
		targets.map((target) => target.attachmentId),
		layout
	);
	const entryById = new Map(
		entries.map((entry) => [Number(entry.row?.id), entry])
	);
	const catalog = readCatalog(store);
	const rows = targets
		.filter(
			({ coreIndex, before, attachmentId }) =>
				catalog[coreIndex] === before && entryById.has(attachmentId)
		)
		.map(({ coreIndex, before, attachmentId }) => {
			const { row, item } = entryById.get(attachmentId);
			return {
				coreIndex,
				row: mergeModulaRowIntoPreviewItem(before, {
					...row,
					src: item.src,
					thumbnail: item.thumbnail,
				}),
			};
		});
	const replaced = replaceItemsInCatalog(catalog, rows);
	if (!replaced) {
		return 0;
	}
	commitPreviewCatalog(store, replaced.catalog);
	const count = replaced.change.replacements.length;
	commitItemsStep({
		label: _n(
			'Replace image',
			'Replace images',
			count,
			'modula-best-grid-gallery'
		),
		change: replaced.change,
	});
	return count;
}
