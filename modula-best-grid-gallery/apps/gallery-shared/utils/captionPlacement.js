/**
 * Caption/title placement relative to the image tile.
 *
 * @package
 */

import { resolveCompactCaptionMinSize } from './compactCaptionTile';

/**
 * Gallery types that manage captions in their own layout (not below-image placement).
 */
export const GALLERY_TYPES_WITHOUT_BELOW_IMAGE_CAPTIONS = [
	'story',
	'bnb',
	'parallax-masonry',
];

/**
 * Layouts where the small-tile caption popover must stay off so hover-builder
 * overlays (and layout-owned motion) are not replaced by a floating panel.
 */
export const GALLERY_TYPES_WITHOUT_COMPACT_CAPTION_POPOVER = [
	'story',
	'bnb',
	'slider',
	'parallax-masonry',
];

/**
 * @param {string|null|undefined} galleryType
 * @return {boolean}
 */
export function galleryTypeSupportsBelowImageCaptions(galleryType) {
	const type = typeof galleryType === 'string' ? galleryType.trim() : '';
	if (type === '') {
		return true;
	}
	return !GALLERY_TYPES_WITHOUT_BELOW_IMAGE_CAPTIONS.includes(type);
}

/**
 * @param {string|null|undefined} galleryType
 * @return {boolean}
 */
export function galleryTypeSupportsCompactCaptionPopover(galleryType) {
	const type = typeof galleryType === 'string' ? galleryType.trim() : '';
	if (type === '') {
		return true;
	}
	return !GALLERY_TYPES_WITHOUT_COMPACT_CAPTION_POPOVER.includes(type);
}

/**
 * @param {Object|null|undefined} source Config, grouped settings, or captions fragment.
 * @return {string}
 */
export function resolveGalleryTypeFromSource(source) {
	if (!source || typeof source !== 'object') {
		return '';
	}
	if (typeof source.type === 'string' && source.type.trim() !== '') {
		return source.type.trim();
	}
	if (
		typeof source.general?.type === 'string' &&
		source.general.type.trim() !== ''
	) {
		return source.general.type.trim();
	}
	return '';
}

/**
 * @param {Object|null|undefined} source Config, grouped settings, or captions fragment.
 * @param {string|null|undefined} [galleryType] Optional gallery type when `source` lacks it.
 * @return {boolean} Default on when unset (and the layout supports it).
 */
export function isCompactCaptionPopoverEnabled(source, galleryType = null) {
	if (!source || typeof source !== 'object') {
		return true;
	}
	const type =
		galleryType !== null && galleryType !== undefined
			? String(galleryType).trim()
			: resolveGalleryTypeFromSource(source);
	if (!galleryTypeSupportsCompactCaptionPopover(type)) {
		return false;
	}
	const raw =
		source.compactCaptionPopover !== undefined
			? source.compactCaptionPopover
			: source.captions?.compactCaptionPopover;
	if (raw === false || raw === 0 || raw === '0') {
		return false;
	}
	return true;
}

/**
 * Shortest-side threshold (px) for compact caption popover. Default 240.
 *
 * @param {Object|null|undefined} source Config, grouped settings, or captions fragment.
 * @return {number}
 */
export function resolveCompactCaptionMinSizeFromSource(source) {
	const raw =
		source?.compactCaptionMinSize ??
		source?.captions?.compactCaptionMinSize;
	return resolveCompactCaptionMinSize(raw);
}

/**
 * @param {Object|null|undefined} source Config or grouped settings fragment.
 * @param {string|null|undefined} [galleryType] Optional gallery type when `source` lacks it.
 * @return {boolean}
 */
export function isCaptionBelowImage(source, galleryType = null) {
	if (!source || typeof source !== 'object') {
		return false;
	}
	const type =
		galleryType !== null && galleryType !== undefined
			? String(galleryType).trim()
			: resolveGalleryTypeFromSource(source);
	if (!galleryTypeSupportsBelowImageCaptions(type)) {
		return false;
	}
	const placement =
		typeof source.contentPlacement === 'string'
			? source.contentPlacement.trim()
			: typeof source.captions?.contentPlacement === 'string'
				? source.captions.contentPlacement.trim()
				: 'inside-image';
	return placement === 'below-image';
}

/**
 * @param {Object|null|undefined} source Config or grouped settings fragment.
 * @return {'left'|'center'|'right'}
 */
export function resolveBelowImageAlignment(source) {
	const raw =
		typeof source?.belowImageAlignment === 'string'
			? source.belowImageAlignment.trim()
			: typeof source?.captions?.belowImageAlignment === 'string'
				? source.captions.belowImageAlignment.trim()
				: 'left';
	if (raw === 'center' || raw === 'right') {
		return raw;
	}
	return 'left';
}

/**
 * Stable layout remount key when caption placement toggles (masonry / grid measure).
 *
 * @param {Object|null|undefined} config
 * @return {'below-image'|'inside-image'}
 */
export function captionPlacementLayoutKey(config) {
	return isCaptionBelowImage(config) ? 'below-image' : 'inside-image';
}

/**
 * @param {Object|null|undefined} source Config or grouped settings fragment.
 * @return {number}
 */
export function resolveBelowImageSpacing(source) {
	const raw =
		source?.belowImageSpacing ?? source?.captions?.belowImageSpacing ?? 8;
	const n = parseInt(raw, 10);
	if (!Number.isFinite(n)) {
		return 8;
	}
	return Math.min(48, Math.max(0, n));
}

/**
 * @param {Object|null|undefined} source Config or grouped settings fragment.
 * @return {number}
 */
export function resolveBelowImagePadding(source) {
	const raw =
		source?.belowImagePadding ?? source?.captions?.belowImagePadding ?? 0;
	const n = parseInt(raw, 10);
	if (!Number.isFinite(n)) {
		return 0;
	}
	return Math.min(48, Math.max(0, n));
}

/**
 * Overlay defaults (#fff) are for text on top of images, not below the tile.
 *
 * @param {string} [color]
 * @return {boolean}
 */
export function isOverlayDefaultCaptionColor(color) {
	const normalized =
		typeof color === 'string' ? color.trim().toLowerCase() : '';
	return (
		!normalized ||
		normalized === '#ffffff' ||
		normalized === '#fff' ||
		normalized === 'white'
	);
}

/**
 * @param {string} [configuredColor]
 * @param {string} [fallback]
 * @return {string}
 */
export function resolveBelowImageTextColor(
	configuredColor,
	fallback = '#1e1e1e'
) {
	if (isOverlayDefaultCaptionColor(configuredColor)) {
		return fallback;
	}
	return String(configuredColor).trim();
}

/**
 * Settings-editor preview: follow light/dark chrome when colors are still overlay defaults.
 *
 * @param {string}  [configuredColor]
 * @param {'title'|'caption'} kind
 * @return {string}
 */
export function resolveBelowImagePreviewTextColor(configuredColor, kind) {
	if (!isOverlayDefaultCaptionColor(configuredColor)) {
		return String(configuredColor).trim();
	}
	return kind === 'title'
		? 'var(--mod-se-preview-ink, #1e1e1e)'
		: 'var(--mod-se-preview-ink-muted, #50575e)';
}
