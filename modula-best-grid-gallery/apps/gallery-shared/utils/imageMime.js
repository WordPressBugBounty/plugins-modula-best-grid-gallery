/**
 * Infer MIME type from URL for <source type="…"> (e.g. .webp -> image/webp).
 *
 * @param {string} url - Image URL
 * @return {string} MIME type
 */
export function getMimeTypeFromUrl(url) {
	if (url === null || url === undefined || typeof url !== 'string') {
		return 'image/jpeg';
	}
	const lower = url.toLowerCase();
	if (lower.includes('.webp')) {
		return 'image/webp';
	}
	if (lower.includes('.png')) {
		return 'image/png';
	}
	if (lower.includes('.gif')) {
		return 'image/gif';
	}
	if (lower.includes('.avif')) {
		return 'image/avif';
	}
	return 'image/jpeg';
}
