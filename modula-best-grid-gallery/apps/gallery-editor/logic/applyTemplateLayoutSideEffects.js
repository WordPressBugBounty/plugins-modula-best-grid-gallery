/**
 * Seed and reconcile template content blocks when layout changes.
 * Uses the same items-array path as “Add content block”.
 *
 * @package
 */

import {
	asGalleryItemList,
	commitPreviewCatalog,
	getTemplateDefinition,
	isEmbeddedGalleryItemRow,
	isTemplateOwnedEmbeddedId,
} from 'gallery-shared/preview';
import {
	buildNewContentBlockRow,
	reanchorEmbeddedRowsInMergedList,
} from '../utils/embeddedGalleryItems';

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
 * @param {string}   slug
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
 * @param {string}   slug
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
 * @param {string}   slug
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
 * Put the layout's content blocks into the preview store, as Add content
 * block does. Nothing is sent: the editor save stores them (ADR 0059).
 *
 * @param {import('@reduxjs/toolkit').Store} store
 * @param {string}                           slug  Template layout.
 * @return {boolean} True when items were changed.
 */
export function seedTemplateContentBlocksForLayout(store, slug) {
	if (!store || !getTemplateDefinition(slug)) {
		return false;
	}
	const core = asGalleryItemList(store.getState().items.items);
	if (!templateLayoutNeedsReconcile(core, slug)) {
		return false;
	}
	commitPreviewCatalog(
		store,
		reanchorEmbeddedRowsInMergedList(
			mergeTemplateContentBlocksForLayout(core, slug)
		)
	);
	return true;
}
