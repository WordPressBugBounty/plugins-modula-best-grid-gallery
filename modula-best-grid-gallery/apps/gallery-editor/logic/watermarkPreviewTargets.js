/**
 * Which canvas tiles show the watermark preview: the images Apply would
 * burn now. A preview on any other tile reads as a burned mark, so a
 * "Selected only" Apply looked like it watermarked the whole gallery and a
 * Remove looked like it left the mark behind.
 *
 * @package
 */

import { isWpTruthy } from './wpTruthy';

/** @type {ReadonlySet<number>} */
export const NO_RESTORED_IDS = new Set();

/**
 * @param {unknown} item Preview store row.
 * @return {number} Attachment ID; 0 for none.
 */
function itemId(item) {
	const id = Number(/** @type {{ id?: unknown }} */ (item)?.id);
	return Number.isFinite(id) && id > 0 ? id : 0;
}

/**
 * @param {unknown} item Preview store row.
 * @return {boolean} Whether Apply burned the image (`modula_watermark_applied`).
 */
function isApplied(item) {
	return isWpTruthy(
		/** @type {{ watermarkApplied?: unknown }} */ (item)?.watermarkApplied
	);
}

/**
 * @typedef {Object} WatermarkPreviewScope
 * @property {string}                  scope       `watermarkApplyScope`: `all` or `selected`.
 * @property {(id: number) => boolean} isSelected  Canvas selection (Select multiple).
 * @property {ReadonlySet<number>}     restoredIds Images Remove restored under the current mark.
 */

/**
 * Whether a tile gets the preview overlay.
 *
 * @param {unknown}               item   The tile's row, as the preview store holds it.
 * @param {WatermarkPreviewScope} target Apply's scope and the images just restored.
 * @return {boolean} False for a burned image, an image outside "Selected only", or one Remove just restored.
 */
export function isWatermarkPreviewTarget(item, target) {
	const id = itemId(item);
	if (id === 0 || isApplied(item)) {
		return false;
	}
	if (target.scope === 'selected' && !target.isSelected(id)) {
		return false;
	}
	return !target.restoredIds.has(id);
}

/**
 * Records each row's `watermarkApplied` and reports the images that went
 * from watermarked to clean: Remove restored them.
 *
 * Rows missing from `items` keep their last record, so a store refresh that
 * briefly empties the list does not hide a later transition.
 *
 * @param {ReadonlyMap<number, boolean>} previous Last `watermarkApplied` per attachment.
 * @param {unknown[]}                    items    Current preview store rows.
 * @return {{ applied: Map<number, boolean>, restoredIds: number[] }} The new records and the restored IDs.
 */
export function diffWatermarkApplied(previous, items) {
	const applied = new Map(previous);
	/** @type {number[]} */
	const restoredIds = [];
	for (const item of Array.isArray(items) ? items : []) {
		const id = itemId(item);
		if (id === 0) {
			continue;
		}
		const nowApplied = isApplied(item);
		if (previous.get(id) === true && !nowApplied) {
			restoredIds.push(id);
		}
		applied.set(id, nowApplied);
	}
	return { applied, restoredIds };
}
