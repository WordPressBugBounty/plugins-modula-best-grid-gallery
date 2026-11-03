/**
 * Collect image rows from bootstrap items for lightbox preview slides.
 *
 * @package
 */

import { isEmbeddedGalleryItemRow } from './embeddedGalleryItemKinds';
import { EXIF_ROW_FIELDS } from './exifCaption';
import { isProbableModulaVideoPlaybackUrl } from '../video/videoGalleryModel';

/**
 * @param {*} value
 * @return {string}
 */
function captionToPlainString(value) {
	if (value === null || value === undefined) {
		return '';
	}
	if (typeof value === 'string') {
		return value;
	}
	if (typeof value === 'number' || typeof value === 'boolean') {
		return String(value);
	}
	if (typeof value === 'object') {
		if (typeof value.raw === 'string') {
			return value.raw;
		}
		if (typeof value.rendered === 'string') {
			return value.rendered;
		}
		if (typeof value.text === 'string') {
			return value.text;
		}
	}
	return '';
}

/**
 * @param {unknown} value
 * @return {string} Non-video URL or empty.
 */
function asPosterUrl(value) {
	const url = typeof value === 'string' ? value.trim() : '';
	if (!url || isProbableModulaVideoPlaybackUrl(url)) {
		return '';
	}
	return url;
}

/**
 * @typedef {Object} LightboxPreviewImageRow
 * @property {string} src         Full-size image URL.
 * @property {string} thumb       Thumbnail URL for Fancybox strip.
 * @property {string} alt         Image alt text.
 * @property {string} title       Plain title.
 * @property {string} description Plain caption/description.
 * @property {Record<string, unknown>} exif The row's stored `exif_*` fields.
 */

/**
 * @param {Record<string, unknown>} row Gallery row.
 * @return {Record<string, unknown>} Its `exif_*` fields that are set.
 */
function pickExifFields(row) {
	const exif = {};
	for (const field of EXIF_ROW_FIELDS) {
		if (row[field] !== undefined) {
			exif[field] = row[field];
		}
	}
	return exif;
}

/**
 * @param {unknown} row
 * @return {LightboxPreviewImageRow|null}
 */
export function galleryRowToLightboxImageRow(row) {
	if (!row || typeof row !== 'object') {
		return null;
	}
	if (isEmbeddedGalleryItemRow(row)) {
		return null;
	}

	const imgAttrs = row.imgAttributes || row.img_attributes || {};
	const linkAttrs = row.linkAttributes || row.link_attributes || {};
	const dataFull = asPosterUrl(imgAttrs['data-full']);
	const linkHref = asPosterUrl(linkAttrs.href);
	/*
	 * Prefer still-image fields over data-full: Pro may leave a video URL on
	 * data-full until the adapter restores the poster.
	 */
	const src =
		asPosterUrl(row.url) ||
		asPosterUrl(row.full) ||
		asPosterUrl(row.image_full) ||
		dataFull ||
		linkHref ||
		asPosterUrl(row.src) ||
		asPosterUrl(row.thumbnail) ||
		'';
	if (!src) {
		return null;
	}

	const thumb = asPosterUrl(row.thumbnail) || asPosterUrl(row.thumb) || src;

	let alt = '';
	if (typeof row.alt === 'string') {
		alt = row.alt;
	}

	const title = captionToPlainString(row.title).trim();
	const description = (
		captionToPlainString(row.description) ||
		captionToPlainString(row.caption)
	).trim();

	if (!alt) {
		alt = title;
	}

	return {
		src,
		thumb,
		alt: alt || title,
		title,
		description,
		exif: pickExifFields(row),
	};
}

/**
 * @param {unknown[]} items Bootstrap gallery rows.
 * @return {LightboxPreviewImageRow[]}
 */
export function collectGalleryImageRowsForLightboxPreview(items) {
	if (!Array.isArray(items)) {
		return [];
	}

	/** @type {LightboxPreviewImageRow[]} */
	const rows = [];

	for (const row of items) {
		const imageRow = galleryRowToLightboxImageRow(row);
		if (imageRow) {
			rows.push(imageRow);
		}
	}

	return rows;
}
