/**
 * @param {string}                  url
 * @param {Record<string, unknown>} row
 * @return {string}
 */
export function pickGalleryReorderThumb(url, row) {
	if (row.video_thumbnail && typeof row.video_thumbnail === 'string') {
		return row.video_thumbnail;
	}
	if (row.thumbnail && typeof row.thumbnail === 'string') {
		return row.thumbnail;
	}
	if (
		row.imgAttributes &&
		typeof row.imgAttributes === 'object' &&
		row.imgAttributes.src
	) {
		return String(row.imgAttributes.src);
	}
	return url || '';
}

/**
 * Setup: mirror server row order. Reorder: keep local drag order unless the image set changed.
 *
 * @param {string[]}          prev
 * @param {string[]}          nextKeys
 * @param {'setup'|'reorder'} step
 * @return {string[]}
 */
export function reconcileOrderKeysWithServer(prev, nextKeys, step) {
	if (step === 'setup') {
		return nextKeys;
	}
	if (
		prev.length === nextKeys.length &&
		prev.length > 0 &&
		prev.every((k) => nextKeys.includes(k)) &&
		nextKeys.every((k) => prev.includes(k))
	) {
		return prev;
	}
	return nextKeys;
}

/**
 * Vertical reorder list only — ignore horizontal delta so the panel width does not grow.
 *
 * @type {import('@dnd-kit/core').Modifier}
 */
function restrictReorderToVerticalAxis({ transform }) {
	return {
		...transform,
		x: 0,
	};
}

export const REORDER_DND_MODIFIERS = [restrictReorderToVerticalAxis];
