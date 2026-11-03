// Page buttons shown at most: first, last, the current page with one
// neighbour on each side, and an ellipsis on each side of that window.
const MAX_SLOTS = 7;

/**
 * The page count for a total, never below one (an empty list still has a
 * page 1 to stand on).
 *
 * @param {number} total
 * @param {number} perPage
 * @return {number} At least 1.
 */
export function pageCountFor(total, perPage) {
	return Math.max(1, Math.ceil(total / perPage));
}

/**
 * The page buttons to draw, in order: page numbers and the strings
 * `'ellipsis-start'` / `'ellipsis-end'` where a run of pages collapses.
 * Up to seven pages are all shown. Past that the row always has seven slots,
 * so the buttons do not jump while paging: near either end five pages sit
 * on that side, otherwise the current page and its neighbours sit between
 * two ellipses, with the first and last page always present.
 *
 * @param {number} page      Current page, 1-based, within 1..pageCount.
 * @param {number} pageCount
 * @return {Array<number|string>} Page numbers and ellipsis keys.
 */
export function paginationItems(page, pageCount) {
	if (pageCount <= MAX_SLOTS) {
		return range(1, pageCount);
	}

	// The window of pages that stays beside an end before collapsing.
	const edgeRun = MAX_SLOTS - 2;
	if (page <= edgeRun - 1) {
		return [...range(1, edgeRun), 'ellipsis-end', pageCount];
	}
	if (page >= pageCount - edgeRun + 2) {
		return [
			1,
			'ellipsis-start',
			...range(pageCount - edgeRun + 1, pageCount),
		];
	}
	return [
		1,
		'ellipsis-start',
		...range(page - 1, page + 1),
		'ellipsis-end',
		pageCount,
	];
}

/**
 * @param {number} from
 * @param {number} to
 * @return {number[]} from..to inclusive.
 */
function range(from, to) {
	return Array.from({ length: to - from + 1 }, (_, index) => from + index);
}
