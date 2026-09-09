/**
 * Low-res preview URL for progressive gallery image loading (LQIP).
 *
 * @package
 */

/**
 * @param {unknown} value
 * @return {string}
 */
function normalizeUrl(value) {
	return typeof value === 'string' && value.trim() !== '' ? value.trim() : '';
}

/**
 * @param {string} srcset
 * @return {string}
 */
function parseSmallestSrcsetUrl(srcset) {
	if (!srcset || typeof srcset !== 'string') {
		return '';
	}
	const parts = srcset
		.split(',')
		.map((part) => part.trim())
		.filter(Boolean);
	/** @type {{ url: string, width: number }|null} */
	let smallest = null;
	for (const part of parts) {
		const tokens = part.split(/\s+/);
		const url = tokens[0];
		if (!url) {
			continue;
		}
		const descriptor = tokens[1] || '';
		let width = Number.POSITIVE_INFINITY;
		if (descriptor.endsWith('w')) {
			width = parseInt(descriptor, 10);
		} else if (descriptor.endsWith('x')) {
			width = parseFloat(descriptor) * 100;
		}
		if (!Number.isFinite(width)) {
			width = Number.POSITIVE_INFINITY;
		}
		if (!smallest || width < smallest.width) {
			smallest = { url, width };
		}
	}
	return smallest?.url || '';
}

/**
 * @param {Object} itemData
 * @param {string} [primarySrc]
 * @return {string}
 */
export function resolveGalleryItemPlaceholderSrc(itemData, primarySrc = '') {
	const thumb = normalizeUrl(
		itemData?.thumbnail ||
			itemData?.imgAttributes?.['data-thumb'] ||
			itemData?.img_attributes?.['data-thumb'] ||
			itemData?.linkAttributes?.['data-thumb'] ||
			itemData?.link_attributes?.['data-thumb']
	);
	const main = normalizeUrl(
		primarySrc || itemData?.src || itemData?.url || itemData?.full || ''
	);
	const smallestSrcset = parseSmallestSrcsetUrl(itemData?.srcset || '');

	if (thumb && thumb !== main) {
		return thumb;
	}
	if (smallestSrcset && smallestSrcset !== main) {
		return smallestSrcset;
	}
	return thumb;
}

/**
 * @param {string} placeholderSrc
 * @param {string} primarySrc
 * @return {boolean}
 */
export function shouldUseGalleryItemPlaceholder(placeholderSrc, primarySrc) {
	if (!placeholderSrc) {
		return false;
	}
	if (!primarySrc) {
		return true;
	}
	return placeholderSrc !== primarySrc;
}
