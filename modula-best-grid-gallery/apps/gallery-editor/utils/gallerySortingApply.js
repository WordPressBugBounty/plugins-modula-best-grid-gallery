/**
 * Compute new modula-images order from sort mode (Pro settings-editor), using REST attachment fields.
 */
export { fetchAttachmentSortFields } from '../api/wpRestMediaBatchApi';

/** @typedef {'manual'|'dateCreatedNew'|'dateCreatedOld'|'dateModifiedFirst'|'dateModifiedLast'|'titleAZ'|'titleZA'|'fileNameAZ'|'fileNameZA'|'random'} GallerySortMode */

export const GALLERY_SORT_MODES = [
	'manual',
	'dateCreatedNew',
	'dateCreatedOld',
	'dateModifiedFirst',
	'dateModifiedLast',
	'titleAZ',
	'titleZA',
	'fileNameAZ',
	'fileNameZA',
	'random',
];

/** Natural order (`IMG_2` before `IMG_10`), ignoring letter case. */
const FILE_NAME_COLLATOR = new Intl.Collator(undefined, {
	numeric: true,
	sensitivity: 'base',
});

/**
 * Items with no file go last in both directions and keep their order. Z–A
 * inverts the comparison instead of reversing the list, so items with the
 * same name keep the order they had before the sort.
 *
 * @param {{ id: number, fileName: string }[]} items     Items in their current order.
 * @param {1|-1}                               direction 1 for A–Z, -1 for Z–A.
 * @return {number[]} Attachment IDs by file name.
 */
function orderByFileName(items, direction) {
	const named = items.filter((item) => item.fileName !== '');
	const unnamed = items.filter((item) => item.fileName === '');
	named.sort(
		(a, b) => direction * FILE_NAME_COLLATOR.compare(a.fileName, b.fileName)
	);
	return [...named, ...unnamed].map((item) => item.id);
}

/**
 * @param {unknown} v
 * @return {v is GallerySortMode}
 */
export function isGallerySortMode(v) {
	return (
		typeof v === 'string' &&
		GALLERY_SORT_MODES.includes(/** @type {any} */ (v))
	);
}

/**
 * Rows from bootstrap `items`.
 *
 * @typedef {{ id: number, title?: string, modulaRowIndex?: number }} BootstrapImageRow
 */

/**
 * @param {BootstrapImageRow[]}                                                                  rows
 * @param {GallerySortMode}                                                                      mode
 * @param {Record<number, { date: string, modified: string, title: string, fileName?: string }>} media
 * @return {number[]} Attachment IDs in new order
 */
export function computeSortedAttachmentOrder(rows, mode, media) {
	const enriched = rows.map((r, idx) => {
		const id = Number(r.id);
		const m = media[id] || { date: '', modified: '', title: '' };
		const rowTitle =
			typeof r.title === 'string' && r.title.trim() ? r.title.trim() : '';
		const sortTitle = rowTitle || m.title || '';
		const stable =
			typeof r.modulaRowIndex === 'number' && r.modulaRowIndex >= 0
				? r.modulaRowIndex
				: idx;
		return {
			id,
			date: m.date,
			modified: m.modified,
			sortTitle,
			fileName: typeof m.fileName === 'string' ? m.fileName : '',
			stable,
		};
	});

	const byDateAsc = [...enriched].sort((a, b) =>
		String(a.date).localeCompare(String(b.date))
	);
	const byModifiedAsc = [...enriched].sort((a, b) =>
		String(a.modified).localeCompare(String(b.modified))
	);
	const byTitleAsc = [...enriched].sort((a, b) =>
		String(a.sortTitle).localeCompare(String(b.sortTitle), undefined, {
			sensitivity: 'base',
		})
	);

	switch (mode) {
		case 'manual':
			return [...enriched]
				.sort((a, b) => a.stable - b.stable)
				.map((x) => x.id);
		case 'dateCreatedOld':
			return byDateAsc.map((x) => x.id);
		case 'dateCreatedNew':
			return [...byDateAsc].reverse().map((x) => x.id);
		case 'dateModifiedLast':
			return byModifiedAsc.map((x) => x.id);
		case 'dateModifiedFirst':
			return [...byModifiedAsc].reverse().map((x) => x.id);
		case 'titleAZ':
			return byTitleAsc.map((x) => x.id);
		case 'titleZA':
			return [...byTitleAsc].reverse().map((x) => x.id);
		case 'fileNameAZ':
			return orderByFileName(enriched, 1);
		case 'fileNameZA':
			return orderByFileName(enriched, -1);
		case 'random': {
			const copy = [...enriched];
			for (let i = copy.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1));
				[copy[i], copy[j]] = [copy[j], copy[i]];
			}
			return copy.map((x) => x.id);
		}
		default:
			return [...enriched]
				.sort((a, b) => a.stable - b.stable)
				.map((x) => x.id);
	}
}

/**
 * @param {unknown[]} items Bootstrap items array
 * @return {BootstrapImageRow[]}
 */
export function bootstrapRowsForSorting(items) {
	if (!Array.isArray(items)) {
		return [];
	}
	const list = [];
	for (const row of items) {
		if (!row || typeof row !== 'object') {
			continue;
		}
		const id = Number(row.id);
		if (!id) {
			continue;
		}
		list.push({
			id,
			title: typeof row.title === 'string' ? row.title : undefined,
			modulaRowIndex:
				typeof row.modulaRowIndex === 'number'
					? row.modulaRowIndex
					: undefined,
		});
	}
	return list;
}
