/**
 * Build Fancybox slides from Redux/bootstrap gallery rows (v2 React path).
 *
 * @package
 */

import { buildLightboxPreviewCaption } from '../utils/buildLightboxPreviewSlides';
import { galleryRowToLightboxImageRow } from '../utils/collectGalleryImageRowsForLightboxPreview';
import { isEmbeddedGalleryItemRow } from '../utils/embeddedGalleryItemKinds';
import { isGalleryItemHiddenFromLightbox } from '../utils/prepareItemData';
import {
	buildLicenseCaptionHtml,
	getLicenseEntry,
	licensingTruthy,
	mergeLightboxCaptionWithLicensing,
} from '../utils/licensing';
import {
	mergeLightboxCaptionWithExtra,
	resolveCaptionExtraHtmlFromRow,
} from '../utils/lightboxCaptionExtra';
import { resolveGalleryItemImageIdFromRow } from '../utils/resolveGalleryItemImageId';
import {
	formatVideoPlaybackUrl,
	getItemVideoUrl,
	isVideoGalleryItem,
	resolveItemLightboxVideoFlags,
} from '../video/videoGalleryModel';

/**
 * @param {unknown} row
 * @param {object} [config]
 * @returns {string}
 */
function resolveLicensingCaptionForRow(row, config) {
	if (
		!config ||
		!licensingTruthy(config.showOnLightbox) ||
		!licensingTruthy(config.imageLicensingExtensionActive)
	) {
		return '';
	}

	const itemKey =
		typeof row?.image_licensing === 'string' ? row.image_licensing : '';
	const galleryKey =
		typeof config.imageLicensing === 'string'
			? config.imageLicensing
			: 'none';
	const effectiveKey = itemKey && itemKey !== 'none' ? itemKey : galleryKey;
	const entry = getLicenseEntry(config.licenseCatalog, effectiveKey);
	return buildLicenseCaptionHtml(entry);
}

/**
 * @param {unknown} row
 * @param {object} [config]
 * @returns {boolean}
 */
function isLightboxSlideRow(row, config) {
	if (!row || typeof row !== 'object') {
		return false;
	}
	if (isEmbeddedGalleryItemRow(row)) {
		return false;
	}
	if (isGalleryItemHiddenFromLightbox(row)) {
		return false;
	}
	const mode =
		typeof row.lightbox === 'string' && row.lightbox.trim() !== ''
			? row.lightbox
			: config?.lightbox || 'fancybox';
	return mode === 'fancybox';
}

/**
 * @param {unknown[]} items Gallery rows from the store.
 * @param {object} [groupedSettings]
 * @param {object} [config] Flat gallery config (licensing, lightbox mode, video).
 * @returns {Array<{ src: string, image_id?: string, opts: object }>}
 */
export function buildModulaLightboxSlidesFromItems(
	items,
	groupedSettings,
	config = {}
) {
	if (!Array.isArray(items) || items.length === 0) {
		return [];
	}

	const lightbox = groupedSettings?.lightbox || {};
	const videoSettings = config?.video || {};
	/** @type {Array<{ src: string, image_id?: string, opts: object }>} */
	const slides = [];

	for (const sourceRow of items) {
		if (!isLightboxSlideRow(sourceRow, config)) {
			continue;
		}

		const row = galleryRowToLightboxImageRow(sourceRow);
		if (!row?.src && !isVideoGalleryItem(sourceRow)) {
			continue;
		}

		const baseCaption = buildLightboxPreviewCaption(
			row || { title: '', description: '', alt: '' },
			lightbox
		);
		const withLicensing = mergeLightboxCaptionWithLicensing(
			baseCaption,
			resolveLicensingCaptionForRow(sourceRow, config)
		);
		const caption = mergeLightboxCaptionWithExtra(
			withLicensing,
			resolveCaptionExtraHtmlFromRow(sourceRow)
		);
		const imageId = resolveGalleryItemImageIdFromRow(sourceRow, false);
		const imageIdStr = imageId > 0 ? String(imageId) : '';
		const itemUrl =
			typeof sourceRow.link === 'string' ? sourceRow.link.trim() : '';
		const itemTarget = sourceRow.target;
		const openInNewTab =
			itemTarget === 1 || itemTarget === '1' || itemTarget === true;

		const videoUrl = getItemVideoUrl(sourceRow);
		const isVideo = videoUrl !== '';
		const flags = isVideo
			? resolveItemLightboxVideoFlags(sourceRow, videoSettings)
			: { autoplay: false, loop: false };
		/*
		 * Lightbox open is a user gesture — do not force mute for autoplay
		 * (classic Pro only adds autoplay to the embed URL, not muted).
		 */
		const playbackSrc = isVideo
			? formatVideoPlaybackUrl(videoUrl, {
					autoplay: flags.autoplay,
					loop: flags.loop,
					mute: false,
				})
			: row.src;
		const poster = isVideo
			? row?.thumb || row?.src || ''
			: row?.thumb || row?.src || '';

		if (!playbackSrc) {
			continue;
		}

		slides.push({
			src: playbackSrc,
			image_id: imageIdStr,
			/*
			 * Fancybox Video plugin: slide.autoplay ?? Carousel.Video.autoplay.
			 * Always set explicitly on video slides so item overrides win.
			 */
			...(isVideo ? { autoplay: flags.autoplay } : {}),
			opts: {
				caption,
				alt: row?.alt || row?.title || '',
				thumb: poster || playbackSrc,
				...(poster && isVideo ? { poster } : {}),
				image_id: imageIdStr,
				...(isVideo
					? {
							modulaVideoAutoplay: flags.autoplay ? 1 : 0,
							modulaVideoLoop: flags.loop ? 1 : 0,
						}
					: {}),
				...(itemUrl
					? {
							modulaItemUrl: itemUrl,
							...(openInNewTab
								? { modulaItemUrlTarget: '_blank' }
								: {}),
						}
					: {}),
			},
		});
	}

	return slides;
}
