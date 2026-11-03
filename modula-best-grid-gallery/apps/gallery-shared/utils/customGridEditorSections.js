/**
 * Custom Grid editor page sections for react-grid-layout, and when a held
 * drag or resize over them must be cancelled.
 *
 * @package
 */

import {
	buildCustomGridRglLayout,
	computeCellSize,
	getResponsiveForCustomGrid,
} from './customGridLayout';
import { galleryItemRowKey } from './galleryItemIdentity';

/**
 * @typedef {Object} CustomGridEditorSection
 * @property {Object[]}    chunk            Gallery items on this page.
 * @property {Object[]}    layout           RGL cells, one per item.
 * @property {Object|null} gridConfig       RGL grid config; null for an empty page.
 * @property {number}      cellSize         Cell size (px).
 * @property {number}      columns          Grid columns.
 * @property {number}      gutter           Gutter (px).
 * @property {boolean}     enableResponsive Responsive spans.
 * @property {string}      rglKey           Page membership and order.
 */

/**
 * @param {Array<Object[]>} chunks          Page groups of gallery items.
 * @param {number}          gridLayoutWidth Rendered grid width (px).
 * @param {Object}          config          Gallery config.
 * @return {CustomGridEditorSection[]} One section per page; none before the width is known.
 */
export function buildCustomGridEditorSections(chunks, gridLayoutWidth, config) {
	if (gridLayoutWidth <= 0) {
		return [];
	}
	const { columns, gutter, enableResponsive } =
		getResponsiveForCustomGrid(config);
	const cellSize = computeCellSize(gridLayoutWidth, columns, gutter);
	return chunks.map((chunk, si) => {
		if (!chunk.length) {
			return {
				chunk,
				layout: [],
				gridConfig: null,
				cellSize: 0,
				columns,
				gutter,
				enableResponsive,
				rglKey: `empty-${si}`,
			};
		}
		const { layout, gridConfig } = buildCustomGridRglLayout(
			chunk,
			gridLayoutWidth,
			config
		);
		return {
			chunk,
			layout,
			gridConfig,
			cellSize,
			columns,
			gutter,
			enableResponsive,
			/** Remount RGL when page membership changes — stale key positions leave gaps. */
			rglKey: chunk
				.map((item, idx) => galleryItemRowKey(item, idx))
				.join('|'),
		};
	});
}

/**
 * Value signature of what the editor grid shows: width, editability, and each
 * page's RGL key (item set and order), cells and grid config. A held gesture
 * is cancelled only when this changes. Store or config objects that a save
 * response recreates with the same values keep the same signature (ticket 75).
 *
 * @param {number}                    gridLayoutWidth Rendered grid width (px).
 * @param {boolean}                   gridEditable    Whether tiles can be dragged and resized.
 * @param {CustomGridEditorSection[]} sections        Sections passed to react-grid-layout.
 * @return {string} Signature to compare by value.
 */
export function customGridGestureLayoutSignature(
	gridLayoutWidth,
	gridEditable,
	sections
) {
	return JSON.stringify([
		gridLayoutWidth,
		Boolean(gridEditable),
		sections.map((section) => [
			section.rglKey,
			section.layout,
			section.gridConfig,
		]),
	]);
}
