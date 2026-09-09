/**
 * Seed and reconcile template content blocks when layout changes.
 * Uses the same items-array + save-merged-items path as “Add content block”.
 *
 * @package
 */

import {
	asGalleryItemList,
	getTemplateDefinition,
	isEmbeddedGalleryItemRow,
	isTemplateOwnedEmbeddedId,
} from 'gallery-shared/preview';
import {
	buildNewContentBlockRow,
	previewCoreItemsToSaveMergedPayload,
	reanchorEmbeddedRowsInMergedList,
} from '../utils/embeddedGalleryItems';
import { saveMergedGalleryItems } from '../api/galleryUploadApi';
import { syncPreviewCoreToStoreAndBootstrap } from '../utils/previewItemsCommit';

/**
 * @param {string} slug
 * @return {{ embeddedId: string, seed: Object }[]}
 */
function templateContentSlots(slug) {
	const def = getTemplateDefinition(slug);
	if (!def) {
		return [];
	}
	return def.slots
		.filter(
			(slot) => slot.role === 'content' && slot.embeddedId && slot.seed
		)
		.map((slot) => ({
			embeddedId: slot.embeddedId,
			seed: slot.seed,
		}));
}

/**
 * @param {Object[]} coreItems
 * @param {string} slug
 * @return {boolean}
 */
export function templateLayoutNeedsContentSeed(coreItems, slug) {
	const slots = templateContentSlots(slug);
	if (!slots.length) {
		return false;
	}
	const existingIds = new Set(
		(Array.isArray(coreItems) ? coreItems : [])
			.filter(isEmbeddedGalleryItemRow)
			.map((row) => String(row.embeddedId || row.id || ''))
	);
	return slots.some((slot) => !existingIds.has(String(slot.embeddedId)));
}

/**
 * True when missing required seeds OR leftover template blocks from another layout.
 *
 * @param {Object[]} coreItems
 * @param {string} slug
 * @return {boolean}
 */
export function templateLayoutNeedsReconcile(coreItems, slug) {
	if (templateLayoutNeedsContentSeed(coreItems, slug)) {
		return true;
	}
	const def = getTemplateDefinition(slug);
	const neededIds = new Set(
		def
			? def.slots
					.filter(
						(slot) => slot.role === 'content' && slot.embeddedId
					)
					.map((slot) => slot.embeddedId)
			: []
	);
	for (const row of Array.isArray(coreItems) ? coreItems : []) {
		if (!isEmbeddedGalleryItemRow(row)) {
			continue;
		}
		const id = String(row.embeddedId || row.id || '');
		if (isTemplateOwnedEmbeddedId(id) && !neededIds.has(id)) {
			return true;
		}
	}
	return false;
}

/**
 * Insert missing template content blocks into the gallery items list
 * (same row shape as Add → content block).
 *
 * @param {Object[]} coreItems
 * @param {string} slug
 * @return {Object[]}
 */
export function mergeTemplateContentBlocksForLayout(coreItems, slug) {
	const core = Array.isArray(coreItems) ? [...coreItems] : [];
	const def = getTemplateDefinition(slug);
	if (!def) {
		return core;
	}

	const neededIds = new Set(
		def.slots
			.filter((slot) => slot.role === 'content' && slot.embeddedId)
			.map((slot) => slot.embeddedId)
	);

	const withoutOtherTemplateBlocks = core.filter((row) => {
		if (!isEmbeddedGalleryItemRow(row)) {
			return true;
		}
		const id = String(row.embeddedId || row.id || '');
		if (!isTemplateOwnedEmbeddedId(id)) {
			return true;
		}
		return neededIds.has(id);
	});

	const existingIds = new Set(
		withoutOtherTemplateBlocks
			.filter(isEmbeddedGalleryItemRow)
			.map((row) => String(row.embeddedId || row.id || ''))
	);

	const slots = templateContentSlots(slug);
	const toInsert = [];
	let working = withoutOtherTemplateBlocks;
	for (const slot of slots) {
		if (existingIds.has(String(slot.embeddedId))) {
			continue;
		}
		const row = buildNewContentBlockRow(working, {
			position: 'end',
			embeddedId: slot.embeddedId,
			title: slot.seed?.title ?? '',
			description: slot.seed?.description ?? '',
			blockBodyHtml: slot.seed?.blockBodyHtml ?? '<p></p>',
			blockFontPreset: slot.seed?.blockFontPreset ?? 'default',
			blockPaddingPreset: slot.seed?.blockPaddingPreset ?? 'default',
			blockBackgroundColor: slot.seed?.blockBackgroundColor,
		});
		toInsert.push(row);
		working = [...working, row];
		existingIds.add(String(slot.embeddedId));
	}

	if (!toInsert.length) {
		return withoutOtherTemplateBlocks;
	}

	return working;
}

/**
 * @param {import('@reduxjs/toolkit').Store} store
 * @param {number} galleryId
 * @param {string} slug
 * @param {(fn: () => void | Promise<void>) => Promise<void>} [runPersistTask]
 * @param {import('@tanstack/react-query').QueryClient|null|undefined} [queryClient]
 * @return {Promise<boolean>} True when items were changed.
 */
export async function seedTemplateContentBlocksForLayout(
	store,
	galleryId,
	slug,
	runPersistTask,
	queryClient
) {
	if (!store || !galleryId || !getTemplateDefinition(slug)) {
		return false;
	}
	const core = asGalleryItemList(store.getState().items.items);
	if (!templateLayoutNeedsReconcile(core, slug)) {
		return false;
	}

	const merged = mergeTemplateContentBlocksForLayout(core, slug);
	const reanchored = reanchorEmbeddedRowsInMergedList(merged);

	/*
	 * Same contract as Add content block:
	 * 1) put real rows in the items array (preview + bootstrap cache)
	 * 2) persist via save-merged-items
	 * Persist reads the live store so later font edits are not overwritten.
	 */
	syncPreviewCoreToStoreAndBootstrap(
		store,
		queryClient,
		galleryId,
		reanchored
	);

	const persist = async () => {
		let latest = asGalleryItemList(store.getState().items.items);
		if (templateLayoutNeedsReconcile(latest, slug)) {
			latest = mergeTemplateContentBlocksForLayout(latest, slug);
		}
		const toSave = reanchorEmbeddedRowsInMergedList(latest);
		await saveMergedGalleryItems(
			galleryId,
			previewCoreItemsToSaveMergedPayload(toSave)
		);
		syncPreviewCoreToStoreAndBootstrap(
			store,
			queryClient,
			galleryId,
			toSave
		);
	};

	if (typeof runPersistTask === 'function') {
		await runPersistTask(persist);
	} else {
		await persist();
	}

	return true;
}
