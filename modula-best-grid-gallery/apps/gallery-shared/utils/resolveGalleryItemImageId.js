/**
 * Resolve a numeric WordPress attachment id for gallery comments / lightbox.
 *
 * @package
 */

/**
 * @param {unknown} value
 * @return {number} Positive attachment id, or 0.
 */
export function normalizeGalleryItemImageId(value) {
	const parsed = parseInt(String(value ?? ''), 10);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

/**
 * @param {unknown} itemData Gallery row from store/bootstrap.
 * @param {boolean} [isEmbedded=false]
 * @return {number}
 */
export function resolveGalleryItemImageIdFromRow(itemData, isEmbedded = false) {
	if (!itemData || typeof itemData !== 'object') {
		return 0;
	}

	if (isEmbedded) {
		return normalizeGalleryItemImageId(itemData.embeddedId);
	}

	const candidates = [
		itemData.id,
		itemData.linkAttributes?.['data-image-id'],
		itemData.link_attributes?.['data-image-id'],
	];

	for (const candidate of candidates) {
		const normalized = normalizeGalleryItemImageId(candidate);
		if (normalized > 0) {
			return normalized;
		}
	}

	return 0;
}

/**
 * @param {HTMLElement|null|undefined} itemEl `.modula-item` root.
 * @return {number}
 */
export function resolveGalleryItemImageIdFromDom(itemEl) {
	if (!itemEl) {
		return 0;
	}

	const link = itemEl.querySelector(
		'.modula-item-link:not(.modula-simple-link)'
	);
	const fromAttr = normalizeGalleryItemImageId(
		link?.getAttribute('data-image-id')
	);
	if (fromAttr > 0) {
		return fromAttr;
	}

	const img = itemEl.querySelector('img.pic');
	if (img?.classList?.length) {
		for (const className of img.classList) {
			if (className.startsWith('wp-image-')) {
				const fromClass = normalizeGalleryItemImageId(
					className.slice('wp-image-'.length)
				);
				if (fromClass > 0) {
					return fromClass;
				}
			}
		}
	}

	const picture = itemEl.querySelector('picture[data-id]');
	return normalizeGalleryItemImageId(picture?.getAttribute('data-id'));
}

/**
 * @param {object|null|undefined} slide Fancybox user slide.
 * @return {number}
 */
export function resolveGalleryItemImageIdFromLightboxSlide(slide) {
	if (!slide || typeof slide !== 'object') {
		return 0;
	}

	const candidates = [
		slide.image_id,
		slide.imageId,
		slide.opts?.image_id,
		slide.opts?.imageId,
	];

	for (const candidate of candidates) {
		const normalized = normalizeGalleryItemImageId(candidate);
		if (normalized > 0) {
			return normalized;
		}
	}

	return 0;
}
