/**
 * Resolve gallery tile link overlay (PHP modula_check_lightboxes_and_links parity).
 *
 * @package
 */

import {
	getItemVideoUrl,
	isProbableModulaVideoPlaybackUrl,
} from '../video/videoGalleryModel';
import { isGalleryItemHiddenFromLightbox } from './prepareItemData';

/**
 * @param {unknown} itemData
 * @returns {string}
 */
function normalizeItemLink(itemData) {
	const raw = itemData?.link;
	return typeof raw === 'string' ? raw.trim() : '';
}

/**
 * @param {unknown} itemData
 * @returns {boolean}
 */
function opensInNewTab(itemData) {
	const target = itemData?.target;
	return target === 1 || target === '1' || target === true;
}

/**
 * @param {unknown} itemData
 * @returns {string}
 */
function readExistingHref(itemData) {
	const attrs = itemData?.linkAttributes || itemData?.link_attributes;
	if (!attrs || typeof attrs !== 'object') {
		return '';
	}
	const href = attrs.href;
	return typeof href === 'string' ? href.trim() : '';
}

/**
 * Full-size image URL for Fancybox href (PHP `$item_data['image_full']` parity).
 * Prefer `url` / `full` over display `src` / `thumbnail`. Skip video playback URLs.
 *
 * @param {Object} itemData
 * @param {{ imageFull?: string }} [ctx]
 * @returns {string}
 */
function resolveFullImageHref(itemData, ctx = {}) {
	const candidates = [
		typeof itemData?.url === 'string' ? itemData.url : '',
		typeof itemData?.full === 'string' ? itemData.full : '',
		typeof itemData?.image_full === 'string' ? itemData.image_full : '',
		typeof itemData?.imgAttributes?.['data-full'] === 'string'
			? itemData.imgAttributes['data-full']
			: '',
		typeof itemData?.img_attributes?.['data-full'] === 'string'
			? itemData.img_attributes['data-full']
			: '',
		typeof ctx.imageFull === 'string' ? ctx.imageFull : '',
		typeof itemData?.src === 'string' ? itemData.src : '',
		typeof itemData?.thumbnail === 'string' ? itemData.thumbnail : '',
	];
	for (const candidate of candidates) {
		const href = candidate.trim();
		if (href && !isProbableModulaVideoPlaybackUrl(href)) {
			return href;
		}
	}
	return '';
}

/**
 * Coerce retired lightbox click modes to their replacements.
 * Legacy `direct` (Direct link to image file) becomes Fancybox.
 *
 * @param {unknown} mode
 * @returns {string}
 */
export function coerceLightboxClickMode(mode) {
	const trimmed = typeof mode === 'string' ? mode.trim() : '';
	if (trimmed === 'direct') {
		return 'fancybox';
	}
	return trimmed;
}

/**
 * @param {Object}      itemData
 * @param {Object}      config
 * @param {{ imageFull?: string, forceNewTab?: boolean }} [ctx]
 * @returns {{
 *   showLink: boolean,
 *   href: string,
 *   isSimpleLink: boolean,
 *   target?: string,
 *   role?: string,
 * }}
 */
export function resolveGalleryItemLink(itemData, config, ctx = {}) {
	const lightbox = coerceLightboxClickMode(
		typeof config?.lightbox === 'string' ? config.lightbox.trim() : ''
	);
	const itemLink = normalizeItemLink(itemData);
	const existingHref = readExistingHref(itemData);
	const forceNewTab = Boolean(ctx.forceNewTab);

	/*
	 * Gallery “No link”: tiles are not clickable. Per-image URLs are ignored on
	 * the tile (they only matter for Go to URL mode, or inside the lightbox
	 * when Open in lightbox is selected).
	 */
	if (lightbox === '' || lightbox === 'no-link') {
		return { showLink: false, href: '', isSimpleLink: false };
	}

	if (lightbox === 'external-url' || lightbox === 'attachment-page') {
		/*
		 * PHP: custom URL when set, else attachment page (`get_attachment_link`).
		 * On the React path the attachment-page URL is already in linkAttributes
		 * when PHP processed the item; fall back to that for parity.
		 */
		const href = itemLink || existingHref;
		if (!href) {
			return { showLink: false, href: '', isSimpleLink: false };
		}
		return {
			showLink: true,
			href,
			isSimpleLink: true,
			...(forceNewTab || opensInNewTab(itemData)
				? { target: '_blank' }
				: {}),
		};
	}

	/*
	 * Hybrid lightbox-prefer-url: a non-empty Custom URL skips the lightbox on
	 * that tile. Follow-gallery items (empty URL) still open the lightbox.
	 * Distinct from external-url (no lightbox for URL-less items).
	 *
	 * Fancybox (Open in lightbox): always lightbox-first on Beta; Custom URL is
	 * exposed as data-modula-item-url for in-lightbox follow (see view model).
	 * Classic PHP still applies tile redirect for Fancybox + Custom URL.
	 */
	if (lightbox === 'lightbox-prefer-url' && itemLink) {
		return {
			showLink: true,
			href: itemLink,
			isSimpleLink: true,
			...(forceNewTab || opensInNewTab(itemData)
				? { target: '_blank' }
				: {}),
		};
	}

	/*
	 * Hide image from lightbox: stay on the gallery, skip Fancybox.
	 * PHP adds modula-simple-link + modula-no-follow and preventDefault.
	 */
	if (isGalleryItemHiddenFromLightbox(itemData)) {
		return {
			showLink: true,
			href: '#',
			isSimpleLink: true,
			role: 'button',
		};
	}

	/*
	 * Fancybox + video: keep href="#" so a missed preventDefault cannot navigate
	 * to the still-image file. Playback lives on videoUrl in lightbox slides.
	 */
	if (getItemVideoUrl(itemData)) {
		return {
			showLink: true,
			href: '#',
			isSimpleLink: false,
			role: 'button',
		};
	}

	const fancyboxHref =
		resolveFullImageHref(itemData, ctx) || existingHref || '#';

	if (!fancyboxHref || fancyboxHref === '#') {
		return {
			showLink: true,
			href: '#',
			isSimpleLink: false,
			role: 'button',
		};
	}

	return {
		showLink: true,
		href: fancyboxHref,
		isSimpleLink: false,
		role: 'button',
	};
}

/**
 * Lightbox modes that use a plain `<a href>` (no Fancybox open).
 * Hybrid `lightbox-prefer-url` is not always-simple (per-item).
 *
 * @param {unknown} lightbox
 * @returns {boolean}
 */
export function isSimpleGalleryLinkMode(lightbox) {
	const mode = coerceLightboxClickMode(lightbox);
	return (
		mode === 'external-url' ||
		mode === 'attachment-page' ||
		mode === 'no-link' ||
		mode === ''
	);
}

/**
 * Whether the gallery lightbox stack (Fancybox bind, scripts, editor Opening/
 * Controls) should be active for this click mode.
 *
 * @param {unknown} lightbox
 * @returns {boolean}
 */
export function galleryUsesFancyboxLightbox(lightbox) {
	const mode = coerceLightboxClickMode(lightbox);
	return mode === 'fancybox' || mode === 'lightbox-prefer-url';
}

/**
 * Tile link overlay options for gallery-shared hosts.
 *
 * Settings-editor preview must never render a navigable tile `<a>` (Go to URL /
 * attachment-page included) so click opens Image edit.
 * Visitor galleries still render those links.
 *
 * @param {boolean} isPreviewContext Settings-editor preview display context.
 * @returns {{ renderLinks: boolean, forceLinkNewTab: boolean }}
 */
export function getTileLinkRenderOptions(isPreviewContext) {
	return {
		renderLinks: !isPreviewContext,
		forceLinkNewTab: false,
	};
}
