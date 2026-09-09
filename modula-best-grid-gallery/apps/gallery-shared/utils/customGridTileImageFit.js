/**
 * Custom grid per-tile image fit (`tile_image_fit` on gallery rows).
 *
 * @package
 */

import { parseItemFocalPoint } from './galleryItemImage';

export const TILE_IMAGE_FIT_CONTAIN = 'contain';
export const TILE_IMAGE_FIT_COVER = 'cover';

export const MODULA_IMG_LETTERBOX_CONTAIN_CLASS =
	'modula-item-img--letterbox-contain';

const VALIGN_TO_Y = {
	top: '0%',
	middle: '50%',
	bottom: '100%',
};

const HALIGN_TO_X = {
	left: '0%',
	center: '50%',
	right: '100%',
};

/**
 * @param {unknown} raw
 * @return {'contain'|'cover'|null}
 */
export function normalizeTileImageFit(raw) {
	if (raw === null || raw === undefined || raw === '') {
		return null;
	}
	const fit = String(raw).trim().toLowerCase();
	if (fit === TILE_IMAGE_FIT_CONTAIN) {
		return TILE_IMAGE_FIT_CONTAIN;
	}
	if (fit === TILE_IMAGE_FIT_COVER) {
		return TILE_IMAGE_FIT_COVER;
	}
	return null;
}

/**
 * @param {Object|null|undefined} itemData
 * @return {'contain'|'cover'|null}
 */
export function parseItemTileImageFit(itemData) {
	if (!itemData) {
		return null;
	}
	const imgAttrs = itemData.imgAttributes || itemData.img_attributes || {};
	const raw =
		itemData.tile_image_fit ??
		itemData.tileImageFit ??
		imgAttrs['data-tile-image-fit'];
	return normalizeTileImageFit(raw);
}

/**
 * @param {Object|null|undefined} itemData
 * @return {boolean}
 */
export function itemUsesCustomGridLetterbox(itemData) {
	return parseItemTileImageFit(itemData) === TILE_IMAGE_FIT_CONTAIN;
}

/**
 * CSS object-position for letterboxed custom-grid tiles.
 *
 * @param {Object|null|undefined} itemData
 * @return {string}
 */
export function customGridLetterboxObjectPositionFromItem(itemData) {
	const focal = parseItemFocalPoint(itemData);
	if (focal) {
		return `${focal.x * 100}% ${focal.y * 100}%`;
	}
	const valign = itemData?.valign ?? 'middle';
	const halign = itemData?.halign ?? 'center';
	const y = VALIGN_TO_Y[String(valign).toLowerCase()] ?? VALIGN_TO_Y.middle;
	const x = HALIGN_TO_X[String(halign).toLowerCase()] ?? HALIGN_TO_X.center;
	return `${x} ${y}`;
}
