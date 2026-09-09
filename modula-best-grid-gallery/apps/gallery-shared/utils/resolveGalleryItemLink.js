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
 * Full-size image URL for "direct" mode (PHP `$item_data['image_full']` parity).
 * Prefer `url` / `full` over display `src` / `thumbnail`. Skip video playback URLs.
 *
 * @param {Object} itemData
 * @param {{ imageFull?: string }} [ctx]
 * @returns {string}
 */
function resolveDirectImageHref(itemData, ctx = {}) {
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
	const lightbox =
		typeof config?.lightbox === 'string' ? config.lightbox.trim() : '';
	const itemLink = normalizeItemLink(itemData);
	const existingHref = readExistingHref(itemData);
	const forceNewTab = Boolean(ctx.forceNewTab);

	/*
	 * Gallery “No link”: tiles are not clickable. Per-image URLs are ignored on
	 * the tile (they only matter for External URL mode, or inside the lightbox
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

	if (lightbox === 'direct') {
		const imageFull = resolveDirectImageHref(itemData, ctx);
		if (!imageFull) {
			return { showLink: false, href: '', isSimpleLink: false };
		}
		return {
			showLink: true,
			href: imageFull,
			isSimpleLink: true,
			...(forceNewTab ? { target: '_blank' } : {}),
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
		resolveDirectImageHref(itemData, ctx) || existingHref || '#';

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
 *
 * @param {unknown} lightbox
 * @returns {boolean}
 */
export function isSimpleGalleryLinkMode(lightbox) {
	const mode = typeof lightbox === 'string' ? lightbox.trim() : '';
	return (
		mode === 'direct' ||
		mode === 'external-url' ||
		mode === 'attachment-page' ||
		mode === 'no-link' ||
		mode === ''
	);
}

/**
 * Tile link overlay options for gallery-shared hosts.
 *
 * Settings-editor preview must never render a navigable tile `<a>` (Direct /
 * External URL / attachment-page included) so click opens Image edit.
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
