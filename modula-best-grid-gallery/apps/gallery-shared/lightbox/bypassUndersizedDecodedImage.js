/**
 * Lightbox workaround for an undersized decoded image in the browser cache.
 *
 * With Image File Size = Full, the grid `img.pic` and the lightbox slide share
 * one URL. Safari with an image optimiser that swaps a placeholder into the
 * grid image (ShortPixel Adaptive Images) can keep a thumbnail-sized decoded
 * copy in its in-memory cache under that URL. Every later image with the URL,
 * including the Fancybox slide, then reports thumbnail-sized natural
 * dimensions and opens small. A slightly different URL makes the browser
 * decode the full file again. See support #51396.
 *
 * Detection reads only what the grid already rendered, without sniffing the
 * browser or the optimiser, so unaffected browsers keep their slides as-is.
 *
 * @package
 */
import { getModulaLightboxItemElements } from './modulaGalleryLightbox';
import {
	resolveGalleryItemImageIdFromDom,
	resolveGalleryItemImageIdFromLightboxSlide,
} from '../utils/resolveGalleryItemImageId';
import { isProbableModulaVideoPlaybackUrl } from '../video/videoGalleryModel';

/** Query parameter that gives the lightbox its own cache entry. */
export const MODULA_FRESH_DECODE_PARAM = 'modula-fresh';

/**
 * A decoded width under this share of the rendered width counts as undersized,
 * so rounding and responsive candidates never trigger the bypass.
 */
const UNDERSIZED_WIDTH_RATIO = 0.9;

/**
 * @param {Object} slide Sanitized Fancybox slide.
 * @return {boolean} Whether the slide shows a still image.
 */
function isImageSlide(slide) {
	if (typeof slide?.src !== 'string' || slide.src === '') {
		return false;
	}
	if (slide.type && slide.type !== 'image') {
		return false;
	}
	// Video slides always carry their playback flags, even with loop off.
	const hasVideoPlaybackFields =
		slide.modulaVideoLoop !== undefined ||
		slide.opts?.modulaVideoLoop !== undefined;
	return (
		!hasVideoPlaybackFields && !isProbableModulaVideoPlaybackUrl(slide.src)
	);
}

/**
 * @param {string} url
 * @return {string} Absolute URL, or '' when it cannot be parsed.
 */
function toAbsoluteUrl(url) {
	try {
		return new URL(url, document.baseURI).href;
	} catch {
		return '';
	}
}

/**
 * Real width of the grid image's file, from its server-rendered attribute.
 *
 * @param {HTMLImageElement} img
 * @return {number} 0 when unknown.
 */
function readRenderedFileWidth(img) {
	const width = Number(img.getAttribute('width'));
	return Number.isFinite(width) && width > 0 ? width : 0;
}

/**
 * Whether the browser decoded the grid image clearly smaller than its file.
 *
 * @param {HTMLImageElement} img
 * @return {boolean} True only for a loaded image with a known file width.
 */
function isDecodedUndersized(img) {
	const expectedWidth = readRenderedFileWidth(img);
	if (expectedWidth === 0 || !img.complete || img.naturalWidth <= 0) {
		return false;
	}
	return img.naturalWidth < expectedWidth * UNDERSIZED_WIDTH_RATIO;
}

/**
 * Grid `img.pic` per attachment id; the first occurrence wins.
 *
 * @param {HTMLElement} galleryRoot
 * @return {Map<number, HTMLImageElement>} Grid images keyed by attachment id.
 */
function mapGridImagesByImageId(galleryRoot) {
	/** @type {Map<number, HTMLImageElement>} */
	const images = new Map();
	for (const itemEl of getModulaLightboxItemElements(galleryRoot)) {
		const imageId = resolveGalleryItemImageIdFromDom(itemEl);
		const img = itemEl.querySelector('img.pic');
		if (imageId > 0 && img && !images.has(imageId)) {
			images.set(imageId, img);
		}
	}
	return images;
}

/**
 * Append the fresh-decode parameter, keeping the existing query and hash.
 *
 * @param {string} src
 * @return {string} The URL with the parameter appended.
 */
export function withFreshDecodeParam(src) {
	const hashStart = src.indexOf('#');
	const base = hashStart === -1 ? src : src.slice(0, hashStart);
	const hash = hashStart === -1 ? '' : src.slice(hashStart);
	const separator = base.includes('?') ? '&' : '?';
	return `${base}${separator}${MODULA_FRESH_DECODE_PARAM}=1${hash}`;
}

/**
 * Display the slide from a fresh URL; downloads and sharing keep the original.
 *
 * @param {Object} slide
 * @return {Object} New slide object.
 */
function displayFromFreshUrl(slide) {
	const originalSrc = slide.src;
	return {
		...slide,
		src: withFreshDecodeParam(originalSrc),
		downloadSrc: slide.downloadSrc || originalSrc,
		opts: {
			...(slide.opts || {}),
			image_src: slide.opts?.image_src ?? originalSrc,
		},
	};
}

/**
 * Point image slides whose grid copy decoded undersized at a fresh URL.
 *
 * A slide changes only when its grid image has the same URL, has loaded, and
 * reports a natural width clearly below its rendered file width. Every other
 * slide is returned by reference, and so is the array when nothing changed.
 *
 * @param {Array<Object>}              slides      Sanitized Fancybox slides.
 * @param {HTMLElement|null|undefined} galleryRoot Gallery host that opened the lightbox.
 * @return {Array<Object>} The slides Fancybox should display.
 */
export function bypassUndersizedDecodedImage(slides, galleryRoot) {
	if (!(galleryRoot instanceof HTMLElement) || !Array.isArray(slides)) {
		return slides;
	}
	if (!slides.some(isImageSlide)) {
		return slides;
	}

	const gridImages = mapGridImagesByImageId(galleryRoot);
	const result = slides.map((slide) =>
		isGridCopyUndersized(slide, gridImages)
			? displayFromFreshUrl(slide)
			: slide
	);
	const changed = result.some((slide, index) => slide !== slides[index]);
	return changed ? result : slides;
}

/**
 * Whether the slide shares its URL with a grid image decoded undersized.
 *
 * @param {Object}                        slide
 * @param {Map<number, HTMLImageElement>} gridImages
 * @return {boolean} True when the slide needs a fresh URL.
 */
function isGridCopyUndersized(slide, gridImages) {
	if (!isImageSlide(slide)) {
		return false;
	}
	const img = gridImages.get(
		resolveGalleryItemImageIdFromLightboxSlide(slide)
	);
	if (!img) {
		return false;
	}
	const gridUrl = toAbsoluteUrl(img.currentSrc || img.src);
	const sharesGridUrl =
		gridUrl !== '' && gridUrl === toAbsoluteUrl(slide.src);
	return sharesGridUrl && isDecodedUndersized(img);
}
