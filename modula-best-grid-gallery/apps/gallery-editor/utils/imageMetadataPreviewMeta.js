/**
 * Preview column chips for the image metadata modal.
 */

/**
 * @param {string|number} bytes
 * @return {string} Human-readable file size or empty when unknown.
 */
export function formatImageFileSize(bytes) {
	const n = Number(bytes);
	if (!Number.isFinite(n) || n <= 0) {
		return '';
	}
	if (n < 1024) {
		return `${n} B`;
	}
	if (n < 1024 * 1024) {
		return `${Math.round(n / 1024)} KB`;
	}
	return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * @param {string|undefined} mime
 * @return {string} Short uppercase type label (e.g. JPEG).
 */
export function mimeToShortType(mime) {
	if (!mime || typeof mime !== 'string') {
		return '';
	}
	const parts = mime.split('/');
	return (parts[1] || parts[0] || mime).toUpperCase();
}

/**
 * @param {string|undefined} url
 * @return {string} Basename decoded from the URL path.
 */
export function filenameFromUrl(url) {
	if (!url || typeof url !== 'string') {
		return '';
	}
	try {
		const path = new URL(url, 'https://example.invalid').pathname;
		const base = path.split('/').pop() || '';
		return decodeURIComponent(base);
	} catch {
		const slash = url.lastIndexOf('/');
		return slash >= 0 ? url.slice(slash + 1) : url;
	}
}

/**
 * @param {Object|null|undefined} item
 * @param {Object|null|undefined} media WP REST media attachment.
 * @return {{ filename: string, dimensions: string, fileType: string, fileSize: string }} Chip labels for the preview column.
 */
export function buildImageMetadataPreviewChips(item, media) {
	const md =
		media && typeof media.media_details === 'object'
			? media.media_details
			: null;
	const width =
		md?.width ?? item?.width ?? item?.imgAttributes?.width ?? null;
	const height =
		md?.height ?? item?.height ?? item?.imgAttributes?.height ?? null;
	let dimensions = '';
	if (width && height) {
		dimensions = `${width} × ${height}`;
	} else if (width) {
		dimensions = `${width}`;
	}

	const fileFromMedia = typeof md?.file === 'string' ? md.file : '';
	const filename =
		fileFromMedia ||
		filenameFromUrl(media?.source_url) ||
		filenameFromUrl(item?.url) ||
		filenameFromUrl(item?.src) ||
		filenameFromUrl(item?.thumbnail) ||
		'';

	const fileType = mimeToShortType(media?.mime_type || item?.mime_type);
	const fileSize = formatImageFileSize(md?.filesize);

	return { filename, dimensions, fileType, fileSize };
}
