/**
 * Gallery anchors for Setting search. Rows carry their anchors through the
 * editor shell (`settingAnchorProps`); the gallery adds the Zoom on hover
 * anchor and the fields of its toggle hierarchy rows.
 */

export { settingAnchorProps, findSettingRow } from 'editor-shell/logic';

/**
 * Anchor of the Zoom on hover toggle, which edits no schema field of its own.
 */
export const ZOOM_ON_HOVER_ANCHOR = 'zoomOnHoverToggle';

/**
 * @param {Object} row Display bucket (`getDisplayBucketsForFields`).
 * @return {Object[]} The fields the row renders.
 */
export function displayRowFields(row) {
	if (row.type === 'hierarchy') {
		return [
			row.parentField,
			...row.childRowBuckets.flatMap((bucket) => bucket.fields),
		];
	}
	return row.fields;
}
