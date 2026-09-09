/**
 * Batch media reads for gallery sorting — `apiFetch` lives here only.
 */
import apiFetch from '@wordpress/api-fetch';
import { addQueryArgs } from '@wordpress/url';

/** WP REST `per_page` max is 100; chunk `include` so large galleries sort correctly. */
const MEDIA_SORT_FIELDS_BATCH = 100;

/**
 * @param {number[]} ids Attachment IDs to load sort metadata for.
 * @return {Promise<Record<number, { date: string, modified: string, title: string }>>} Map of id → date/modified/title for sorting.
 */
export async function fetchAttachmentSortFields(ids) {
	const unique = [...new Set(ids.filter((n) => n > 0))];
	const out = {};
	if (!unique.length) {
		return out;
	}
	for (
		let offset = 0;
		offset < unique.length;
		offset += MEDIA_SORT_FIELDS_BATCH
	) {
		const chunk = unique.slice(offset, offset + MEDIA_SORT_FIELDS_BATCH);
		const path = addQueryArgs('/wp/v2/media', {
			per_page: MEDIA_SORT_FIELDS_BATCH,
			include: chunk.join(','),
		});
		/** @type {Array<Record<string, unknown>>} */
		const rows = await apiFetch({ path });
		if (!Array.isArray(rows)) {
			continue;
		}
		for (const row of rows) {
			const id = Number(row?.id);
			if (!id) {
				continue;
			}
			const date = typeof row.date === 'string' ? row.date : '';
			let modified = '';
			if (typeof row.modified === 'string') {
				modified = row.modified;
			} else if (typeof row.modified_gmt === 'string') {
				modified = row.modified_gmt;
			}
			let title = '';
			const t = row.title;
			if (t && typeof t === 'object' && 'rendered' in t) {
				title = String(
					/** @type {{ rendered?: string }} */ (t).rendered || ''
				);
			} else if (typeof t === 'string') {
				title = t;
			}
			out[id] = {
				date,
				modified,
				title: title.replace(/<[^>]+>/g, '').trim(),
			};
		}
	}
	return out;
}
