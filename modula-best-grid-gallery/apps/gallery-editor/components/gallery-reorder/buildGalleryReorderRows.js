import { __, sprintf } from '@wordpress/i18n';
import { isEmbeddedGalleryItemRow } from '../../utils/embeddedGalleryItems';
import { isVideoTemplateRow } from '../../utils/videoTemplateItems';
import { pickGalleryReorderThumb } from './galleryReorderUtils';

/**
 * @typedef {{
 *   sortKey: string,
 *   rowType: string,
 *   attachmentId: number,
 *   label: string,
 *   thumb: string,
 *   blockBg: string,
 *   rawRow: Record<string, unknown>,
 *   modulaRowIndex: number,
 * }} GalleryReorderRow
 */

/**
 * Bootstrap gallery rows → reorder list entries (images, videos, embedded blocks).
 *
 * @param {object|undefined|null} bootstrap
 * @return {GalleryReorderRow[]}
 */
export function buildGalleryReorderRows(bootstrap) {
	const items = Array.isArray(bootstrap?.items) ? bootstrap.items : [];
	/** @type {GalleryReorderRow[]} */
	const list = [];
	let n = 0;

	for (const row of items) {
		if (!row) {
			continue;
		}
		if (isEmbeddedGalleryItemRow(row)) {
			const eid = String(row.embeddedId || row.id || '');
			if (!eid) {
				continue;
			}
			const kind = row.itemKind;
			let label =
				kind === 'shortcode'
					? __('Shortcode', 'modula-best-grid-gallery')
					: __('Content block', 'modula-best-grid-gallery');
			const t = typeof row.title === 'string' ? row.title.trim() : '';
			if (t) {
				label = `${label}: ${t}`;
			}
			let blockBg = '';
			if (kind === 'content_block') {
				const c =
					typeof row.blockBackgroundColor === 'string'
						? row.blockBackgroundColor.trim()
						: '';
				blockBg = c;
			}
			list.push({
				sortKey: `emb-${eid}`,
				rowType: kind,
				attachmentId: 0,
				label,
				thumb: '',
				blockBg,
				rawRow: { ...row },
				modulaRowIndex: -1,
			});
			n++;
			continue;
		}
		if (isVideoTemplateRow(row)) {
			const videoId = String(row.id ?? '').trim();
			if (!videoId) {
				continue;
			}
			const stable =
				typeof row.modulaRowIndex === 'number' &&
				row.modulaRowIndex >= 0
					? row.modulaRowIndex
					: n;
			const thumbUrl =
				typeof row.video_thumbnail === 'string' && row.video_thumbnail
					? row.video_thumbnail
					: pickGalleryReorderThumb(
							typeof row.url === 'string' ? row.url : '',
							row
						);
			const videoTitle =
				typeof row.video_title === 'string'
					? row.video_title.trim()
					: '';
			const rowTitle =
				typeof row.title === 'string' ? row.title.trim() : '';
			const label =
				rowTitle ||
				videoTitle ||
				__('Video', 'modula-best-grid-gallery');
			list.push({
				sortKey: `vid-${stable}-${videoId}-${n}`,
				rowType: 'video',
				attachmentId: 0,
				label,
				thumb: thumbUrl,
				blockBg: '',
				rawRow: { ...row },
				modulaRowIndex: stable,
			});
			n++;
			continue;
		}
		const idNum =
			row.id === null || row.id === undefined ? 0 : Number(row.id);
		if (!idNum) {
			continue;
		}
		const stable =
			typeof row.modulaRowIndex === 'number' && row.modulaRowIndex >= 0
				? row.modulaRowIndex
				: n;
		let url = '';
		if (typeof row.full === 'string' && row.full) {
			url = row.full;
		} else if (typeof row.url === 'string') {
			url = row.url;
		}
		const title =
			typeof row.title === 'string' && row.title.trim()
				? row.title.trim()
				: sprintf(
						/* translators: %d: WordPress attachment ID */
						__('Image %d', 'modula-best-grid-gallery'),
						idNum
					);
		list.push({
			sortKey: `img-${stable}-${idNum}-${n}`,
			rowType: 'image',
			attachmentId: idNum,
			label: title,
			thumb: pickGalleryReorderThumb(url, row),
			blockBg: '',
			rawRow: { ...row },
			modulaRowIndex: stable,
		});
		n++;
	}

	return list;
}
