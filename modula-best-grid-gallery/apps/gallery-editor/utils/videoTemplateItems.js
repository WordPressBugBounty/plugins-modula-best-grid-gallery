import {
	applyVideoPosterFieldsToPreviewItem,
	resolveVideoPosterDisplayUrl,
} from 'gallery-shared/preview';
/**
 * Build modula-images rows for video template items (takeover Add New → Video / Playlist).
 */

/**
 * @param {unknown} row Bootstrap / Redux gallery row.
 * @return {boolean}
 */
export function isVideoTemplateRow(row) {
	if (!row || typeof row !== 'object') {
		return false;
	}
	const vt = /** @type {{ video_template?: unknown, id?: unknown }} */ (row)
		.video_template;
	if (vt === '1' || vt === 1 || vt === true) {
		return true;
	}
	const id = String(/** @type {{ id?: unknown }} */ (row).id ?? '').trim();
	return /^video_template_\d+$/.test(id);
}

/**
 * Poster / tile image URL for a video row (never the .mp4 playback URL).
 *
 * @param {Object} item
 * @param {{ video_thumbnail?: string, video_url?: string }} [overrides] Form or patch values.
 * @return {string}
 */
export function resolveVideoItemDisplayImageUrl(item, overrides = {}) {
	return resolveVideoPosterDisplayUrl(item, overrides);
}

/**
 * Sync poster/display URLs on a preview Redux row (thumbnail, src, imgAttributes, …).
 *
 * @param {Object} item
 * @param {{ video_thumbnail?: string, video_url?: string }} [overrides]
 * @return {Object}
 */
export function applyVideoTemplateDisplayFieldsToPreviewItem(
	item,
	overrides = {}
) {
	return applyVideoPosterFieldsToPreviewItem(item, overrides);
}

/**
 * @param {Object[]} coreItems
 * @return {number} Next numeric suffix for `video_template_{n}` ids.
 */
export function nextVideoTemplateId(coreItems) {
	let lastId = 0;
	for (const row of coreItems || []) {
		const id = String(row?.id ?? '');
		const match = id.match(/^video_template_(\d+)$/);
		if (match) {
			const current = parseInt(match[1], 10);
			if (current >= lastId) {
				lastId = current + 1;
			}
		}
	}
	return lastId;
}

/**
 * @param {Record<string, unknown>} snap   AJAX snap payload (`title`, `thumb`, `width`, …).
 * @param {string}                  videoUrl Persisted video URL.
 * @param {number}                  templateId Numeric suffix for `video_template_{id}`.
 * @return {Record<string, unknown>} modula-images row.
 */
export function buildVideoTemplateRow(snap, videoUrl, templateId) {
	const thumb =
		(typeof snap?.thumb === 'string' && snap.thumb) ||
		(typeof snap?.thumbnail === 'string' && snap.thumbnail) ||
		'';
	const title = typeof snap?.title === 'string' ? snap.title : '';
	const description =
		typeof snap?.description === 'string' ? snap.description : '';

	return {
		id: `video_template_${templateId}`,
		video_template: '1',
		video_url: videoUrl,
		video_title: title,
		video_alt: typeof snap?.alt === 'string' ? snap.alt : '',
		video_description: description,
		thumbnail: thumb,
		video_thumbnail: thumb,
		full: thumb,
		title,
		description,
		video_width: snap?.width || 1920,
		video_height: snap?.height || 1080,
		autoplay_thumbnail: 'inherit',
		autoplay_lightbox: 'inherit',
		loop_video: 'inherit',
		halign: 'center',
		valign: 'middle',
		link: '',
		target: '',
		togglelightbox: '',
	};
}

/**
 * @param {Object[]} coreItems
 * @param {Object[]} newRows
 * @param {'start'|'end'} uploadPosition
 * @return {Object[]}
 */
export function insertVideoRows(coreItems, newRows, uploadPosition) {
	const core = Array.isArray(coreItems) ? coreItems : [];
	const rows = Array.isArray(newRows) ? newRows : [];
	if (!rows.length) {
		return core;
	}
	if (uploadPosition === 'start') {
		return [...rows, ...core];
	}
	return [...core, ...rows];
}

/**
 * @param {Record<string, unknown>[]} snapList Playlist AJAX rows (each with `video_url`).
 * @param {Object[]}                  coreItems
 * @param {'start'|'end'}             uploadPosition
 * @return {Object[]}
 */
export function buildVideoRowsFromPlaylistSnaps(
	snapList,
	coreItems,
	uploadPosition
) {
	const startId = nextVideoTemplateId(coreItems);
	const built = snapList.map((snap, index) => {
		const url = typeof snap?.video_url === 'string' ? snap.video_url : '';
		return buildVideoTemplateRow(snap, url, startId + index);
	});
	let ordered = built;
	if (uploadPosition === 'start') {
		ordered = [...built].reverse();
	}
	return insertVideoRows(coreItems, ordered, uploadPosition);
}
