/**
 * Modula Gallery - Prepare item data for rendering (same structure as RenderManager)
 *
 * @package
 */

import { isEmbeddedGalleryItemRow } from './embeddedGalleryItemKinds';
import { getSocialShareUrl } from './socialShareUrls';
import { resolveGalleryItemImageIdFromRow } from './resolveGalleryItemImageId';
import {
	normalizeTileImageFit,
	TILE_IMAGE_FIT_CONTAIN,
} from './customGridTileImageFit';
import { parseItemFocalCrop, parseItemFocalPoint } from './galleryItemImage';
import {
	isGalleryTypeWithoutHoverEffects,
	isGalleryTypeWithItemDimensions,
} from '../constants/galleryLayoutDefaults';

const SOCIAL_TYPES = [
	{ key: 'enableTwitter', type: 'twitter', label: 'Share on X' },
	{ key: 'enableFacebook', type: 'facebook', label: 'Share on Facebook' },
	{ key: 'enableWhatsapp', type: 'whatsapp', label: 'Share on Whatsapp' },
	{ key: 'enablePinterest', type: 'pinterest', label: 'Share on Pinterest' },
	{ key: 'enableLinkedin', type: 'linkedin', label: 'Share on LinkedIn' },
	{ key: 'enableEmail', type: 'email', label: 'Share by Email' },
];

/**
 * WordPress / REST item flags are often 1 or '1'.
 *
 * @param {*} value
 * @return {boolean}
 */
export function isGalleryItemFlagOn(value) {
	return value === true || value === 1 || value === '1';
}

/**
 * Per-item Hide title (`hide_title` / `hideTitle`) plus gallery-level hideTitle.
 *
 * @param {Object|null|undefined} itemData
 * @param {Object|null|undefined} [config]
 * @return {boolean}
 */
export function isGalleryItemTitleHidden(itemData, config = {}) {
	return (
		isGalleryItemFlagOn(itemData?.hideTitle) ||
		isGalleryItemFlagOn(itemData?.hide_title) ||
		isGalleryItemFlagOn(config?.hideTitle)
	);
}

/**
 * Per-item Hide image from lightbox (`togglelightbox` / `toggleLightbox`).
 *
 * @param {Object|null|undefined} itemData
 * @return {boolean}
 */
export function isGalleryItemHiddenFromLightbox(itemData) {
	return (
		isGalleryItemFlagOn(itemData?.togglelightbox) ||
		isGalleryItemFlagOn(itemData?.toggleLightbox)
	);
}

function prepareSocials(itemData, config, options = {}) {
	const socials = [];
	const imageUrl =
		itemData.url ||
		itemData.src ||
		itemData.thumbnail ||
		itemData.full ||
		'';
	const deeplinkEnabled = Boolean(config?.modulaDeeplink);
	const deeplinkIndex =
		typeof options.deeplinkIndex === 'number' && options.deeplinkIndex >= 0
			? options.deeplinkIndex
			: typeof itemData.index === 'number' && itemData.index >= 0
				? itemData.index
				: undefined;
	const shareBase = {
		itemId: itemData.id,
		galleryId: config.galleryId,
		imageUrl,
		title: itemData.title || '',
		emailSubject: config.email_subject || '',
		emailMessage: config.email_message || '',
		deeplinkEnabled,
		deeplinkPrefix: config.customLinkName || 'modulagallery',
		deeplinkIndex,
	};
	SOCIAL_TYPES.forEach((social) => {
		if (config[social.key]) {
			socials.push({
				type: social.type,
				label: social.label,
				url: getSocialShareUrl(social.type, shareBase),
			});
		}
	});
	return socials;
}

/**
 * Raw item shape from the frontend (shortcode/API).
 *
 * @typedef {Object} RawGalleryItem
 * @property {number}                                                id
 * @property {string}                                                [title]
 * @property {string}                                                [description]
 * @property {string}                                                [alt]
 * @property {string}                                                [src]             - Image src (often empty; fallback: thumbnail, then url)
 * @property {string}                                                [thumbnail]
 * @property {string}                                                [url]             - Full-size image URL (used when src/thumbnail empty)
 * @property {string}                                                [srcset]
 * @property {string}                                                [sizes]
 * @property {{ type?: string, srcset?: string, srcSet?: string }[]} [pictureSources]  - Optional Wix-style sources (e.g. image/webp + image/jpeg with 1x/2x)
 * @property {string}                                                [valign]
 * @property {string}                                                [halign]
 * @property {boolean}                                               [hideTitle]
 * @property {boolean}                                               [hideDescription]
 * @property {boolean}                                               [hideSocials]
 * @property {boolean|number}                                        [lazyLoad]
 * @property {string[]}                                              [itemClasses]
 * @property {Object[]}                                              [itemAttributes]
 * @property {string[]}                                              [linkClasses]
 * @property {Object}                                                [linkAttributes]  - e.g. data-image-id, role, data-thumb
 * @property {string[]}                                              [imgClasses]
 * @property {Object}                                                [imgAttributes]   - e.g. data-valign, data-halign, alt, data-full, title, data-download-filename
 * @property {number}                                                [width]           - For grid/custom-grid/creative-gallery
 * @property {number}                                                [height]
 */

/**
 * Normalize raw item data for the item-tile view model (implementation detail).
 * Layouts and Showcase should call `getItemTileViewModel` / `getGalleryItemViewModel`,
 * not this helper.
 *
 * @param {RawGalleryItem} itemData - Raw item from store
 * @param {Object}         config   - Gallery config from store
 * @param {Object}         [options]
 * @param {number}         [options.deeplinkIndex] 0-based index among lightbox slides
 * @return {Object} Prepared item
 */
export function prepareItemData(itemData, config, options = {}) {
	const isEmbedded = isEmbeddedGalleryItemRow(itemData);
	// Pro / external video rows may use id 0 (no attachment); 0 is valid.
	// Embedded v2 tiles use string UUID `id` / `embeddedId`.
	if (
		!itemData ||
		((itemData.id === undefined ||
			itemData.id === null ||
			itemData.id === '') &&
			!isEmbedded)
	) {
		return null;
	}

	const rowId = isEmbedded ? itemData.embeddedId || itemData.id : itemData.id;
	const commentImageId = resolveGalleryItemImageIdFromRow(
		itemData,
		isEmbedded
	);
	const item = {
		id: rowId,
		title: itemData.title || '',
		description: itemData.description || itemData.caption || '',
		alt: itemData.alt || itemData.title || '',
		lightbox: config.lightbox || 'fancybox',
		hideTitle: isGalleryItemTitleHidden(itemData, config),
		hideDescription:
			isGalleryItemFlagOn(itemData.hideDescription) ||
			isGalleryItemFlagOn(config.hideDescription),
		/*
		 * PHP sets item.hideSocials when socialDesktopCollapsed (legacy = hide inline
		 * .modula-social only; expandable FAB still renders). Do not treat that as a
		 * full socials kill-switch. Honor per-item/hover hide when not collapsed.
		 */
		hideSocials:
			!config.enableSocial ||
			(Boolean(itemData.hideSocials) && !config.socialDesktopCollapsed) ||
			false,
		/** Folded share FAB on desktop (listing expandable UX); not the same as hideSocials. */
		socialDesktopCollapsed: !!config.socialDesktopCollapsed,
		lazyLoad: itemData.lazyLoad || config.lazyLoad || false,

		// Always copy: Redux/Immer may freeze `itemData.itemClasses`; slider/story mutate below.
		itemClasses: Array.isArray(itemData.itemClasses)
			? [...itemData.itemClasses]
			: ['modula-item'],
		// Shallow copy: Redux/Immer may freeze itemData.itemAttributes; we mutate below for grids.
		itemAttributes: { ...(itemData.itemAttributes || {}) },

		linkClasses: Array.isArray(itemData.linkClasses)
			? [...itemData.linkClasses]
			: ['tile-inner', 'modula-item-link'],
		linkAttributes: {
			role: 'button',
			...(itemData.linkAttributes || itemData.link_attributes || {}),
			...(commentImageId > 0
				? { 'data-image-id': String(commentImageId) }
				: {}),
			...(itemData.image_licensing &&
			typeof itemData.image_licensing === 'string' &&
			itemData.image_licensing !== 'none'
				? { 'data-image-licensing': itemData.image_licensing }
				: {}),
		},

		imgClasses: (() => {
			if (Array.isArray(itemData.imgClasses)) {
				return [...itemData.imgClasses];
			}
			if (isEmbedded) {
				return ['pic', 'modula-embedded-pic'];
			}
			return ['pic', `wp-image-${itemData.id}`];
		})(),
		imgAttributes: (() => {
			const base = {
				'data-valign': itemData.valign || 'middle',
				'data-halign': itemData.halign || 'center',
				...(itemData.imgAttributes || {}),
			};
			const focal = parseItemFocalPoint(itemData);
			if (focal) {
				base['data-focal-x'] = String(focal.x);
				base['data-focal-y'] = String(focal.y);
			}
			const focalCrop = parseItemFocalCrop(itemData);
			if (focalCrop) {
				base['data-focal-crop-x'] = String(focalCrop.x);
				base['data-focal-crop-y'] = String(focalCrop.y);
				base['data-focal-crop-w'] = String(focalCrop.width);
				base['data-focal-crop-h'] = String(focalCrop.height);
			}
			const tileFit = normalizeTileImageFit(itemData.tile_image_fit);
			if (tileFit === TILE_IMAGE_FIT_CONTAIN) {
				base['data-tile-image-fit'] = TILE_IMAGE_FIT_CONTAIN;
			}
			return base;
		})(),

		image: {
			src: itemData.src || itemData.thumbnail || itemData.url || '',
			alt: itemData.alt || itemData.title || '',
			srcset: itemData.srcset || '',
			sizes: itemData.sizes || '',
		},

		socials: prepareSocials(itemData, config, options),
	};

	if (config.type === 'slider' || config.type === 'story') {
		if (!item.itemClasses.includes('f-carousel__slide')) {
			item.itemClasses.push('f-carousel__slide');
		}
		if (config.sliderThumbsEnabled) {
			const thumbSrc =
				itemData.thumbnail || itemData.src || itemData.url || '';
			if (thumbSrc) {
				item.itemAttributes = {
					...item.itemAttributes,
					'data-thumb-src': thumbSrc,
				};
			}
		}
	}

	if (isGalleryTypeWithoutHoverEffects(config.type)) {
		item.itemClasses = item.itemClasses.filter((cls) => {
			const name = String(cls || '');
			if (name === 'modula-item' || name === 'f-carousel__slide') {
				return true;
			}
			if (name.startsWith('modula-hover-')) {
				return false;
			}
			if (name.startsWith('effect-')) {
				return false;
			}
			return true;
		});
		if (!item.itemClasses.includes('modula-item')) {
			item.itemClasses.unshift('modula-item');
		}
	}

	if (isGalleryTypeWithItemDimensions(config.type)) {
		if (itemData.width) {
			item.itemAttributes['data-width'] = itemData.width;
		}
		if (itemData.height) {
			item.itemAttributes['data-height'] = itemData.height;
		}
	}

	return item;
}
