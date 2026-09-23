/**
 * Commit and restore custom-grid layout steps on gallery editor history.
 *
 * @package
 */

import { __ } from '@wordpress/i18n';
import {
	mergeCustomGridItemCells,
	snapshotCustomGridItemCells,
} from './customGridItemCells';

/**
 * @param {'drag'|'resize'|string|null|undefined} kind
 * @return {string} Brief status-bar / tooltip label.
 */
export function describeCustomGridLayoutStep(kind) {
	if (kind === 'resize') {
		return __('Resize tile', 'modula-best-grid-gallery');
	}
	return __('Move tile', 'modula-best-grid-gallery');
}

/**
 * @param {boolean} locked Whether the step locked the tile (true) or unlocked it.
 * @return {string} Brief status-bar / tooltip label.
 */
export function describeCustomGridLockStep(locked) {
	if (locked) {
		return __('Lock tile', 'modula-best-grid-gallery');
	}
	return __('Unlock tile', 'modula-best-grid-gallery');
}

/**
 * After a live drag/resize has updated the preview catalog, push one layout step
 * with a full-catalog custom-grid item cell slice (includes compact-moved tiles).
 *
 * Seed the pre-change slice with `history.adoptLayoutCheckpoint` at interaction start.
 *
 * @param {{
 *   commitLayoutStep: (args: { label: string, layout: Record<string, unknown> }) => void,
 * }} history
 * @param {{ kind?: 'drag'|'resize'|string|null, catalog: unknown }} args
 * @return {Record<string, unknown>} Committed slice.
 */
export function commitCustomGridLayoutHistoryStep(history, args) {
	const layout = snapshotCustomGridItemCells(args?.catalog);
	history.commitLayoutStep({
		label: describeCustomGridLayoutStep(args?.kind),
		layout,
	});
	return layout;
}

/**
 * After a lock toggle has updated the preview catalog, push one layout step for
 * that gallery item id only.
 *
 * Seed the pre-change cell with `history.adoptLayoutCheckpoint` before mutating.
 *
 * @param {{
 *   commitLayoutStep: (args: { label: string, layout: Record<string, unknown> }) => void,
 * }} history
 * @param {{
 *   locked: boolean,
 *   galleryItemId: string|number,
 *   catalog: unknown,
 * }} args
 * @return {Record<string, unknown>|null} Committed single-id slice, or null when the id is missing.
 */
export function commitCustomGridLockHistoryStep(history, args) {
	const id = String(args?.galleryItemId ?? '').trim();
	if (id === '') {
		return null;
	}
	const full = snapshotCustomGridItemCells(args?.catalog);
	if (!Object.prototype.hasOwnProperty.call(full, id)) {
		return null;
	}
	const layout = { [id]: full[id] };
	history.commitLayoutStep({
		label: describeCustomGridLockStep(Boolean(args?.locked)),
		layout,
	});
	return layout;
}

/**
 * Best-effort merge of a layout history slice onto the current preview catalog.
 *
 * @param {unknown} catalog
 * @param {Record<string, unknown>|null|undefined} layoutSlice
 * @return {Object[]}
 */
export function restoreCatalogFromLayoutHistory(catalog, layoutSlice) {
	return mergeCustomGridItemCells(catalog, layoutSlice);
}
