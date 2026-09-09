/**
 * Normalize listing row thumbnails for the stacked preview.
 *
 * @param {{ thumbnailUrls?: string[], thumbnailUrl?: string }} item
 * @param {number} [limit=3]
 * @return {string[]}
 */
export function getListingThumbnailUrls(item, limit = 3) {
	const max = Number(limit) > 0 ? Number(limit) : 3;
	const fromArray = Array.isArray(item?.thumbnailUrls)
		? item.thumbnailUrls.filter(
				(url) => typeof url === 'string' && url.trim() !== ''
			)
		: [];

	if (fromArray.length > 0) {
		return uniqueUrls(fromArray).slice(0, max);
	}

	if (typeof item?.thumbnailUrl === 'string' && item.thumbnailUrl.trim()) {
		return [item.thumbnailUrl.trim()];
	}

	return [];
}

/**
 * @param {string[]} urls
 * @return {string[]}
 */
function uniqueUrls(urls) {
	const seen = new Set();
	const out = [];
	for (const url of urls) {
		const trimmed = url.trim();
		if (!trimmed || seen.has(trimmed)) {
			continue;
		}
		seen.add(trimmed);
		out.push(trimmed);
	}
	return out;
}
