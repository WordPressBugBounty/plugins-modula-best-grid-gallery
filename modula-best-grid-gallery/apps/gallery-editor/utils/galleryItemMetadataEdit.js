/**
 * An Image panel metadata edit as a change of the preview catalog (ADR 0059):
 * the canvas shows it at once and the editor save stores it with the items
 * (`save-merged-items`, which also writes the attachment's title, alt and
 * caption). Nothing here sends a request.
 *
 * @package
 */
import { isEmbeddedGalleryItemRow } from 'gallery-shared/preview';
import { defaultImageMetadataValuesFromItem } from '../form/useImageMetadataForm';
import {
	ITEM_CSS_CLASS_KEY,
	ITEM_HOVER_PRESET_KEY,
	sanitizeItemCssClass,
} from './galleryItemFields';
import { applyVideoTemplateDisplayFieldsToPreviewItem } from './videoTemplateItems';

/** Text kept on the attachment: every tile of that attachment shows it. */
const ATTACHMENT_TEXT_KEYS = ['title', 'alt', 'description'];

const ROW_KEYS = [
	'link',
	'target',
	'halign',
	'valign',
	'togglelightbox',
	'hide_title',
	ITEM_HOVER_PRESET_KEY,
	ITEM_CSS_CLASS_KEY,
];

const FILTER_KEYS = ['filters'];

const VIDEO_KEYS = [
	'video_url',
	'video_thumbnail',
	'autoplay_thumbnail',
	'autoplay_lightbox',
	'loop_video',
];

const EXIF_KEYS = [
	'exif_camera',
	'exif_lens',
	'exif_focal_length',
	'exif_shutter_speed',
	'exif_aperture',
	'exif_iso',
	'exif_date',
];

/** Row keys stored as numbers, as the per-item write sent them. */
const NUMERIC_KEYS = new Set(['target', 'togglelightbox', 'hide_title']);

/**
 * @typedef {Object} ImageMetadataEditableGroups
 * @property {boolean} filters Pro: the image's filters.
 * @property {boolean} video   Video extension: video URL, thumbnail, autoplay, loop.
 * @property {boolean} exif    EXIF extension with EXIF enabled for the gallery.
 */

/**
 * @param {ImageMetadataEditableGroups} groups
 * @return {string[]} Form keys the panel may change on the row.
 */
function editableKeys(groups) {
	return [
		...ATTACHMENT_TEXT_KEYS,
		...ROW_KEYS,
		...(groups.filters ? FILTER_KEYS : []),
		...(groups.video ? VIDEO_KEYS : []),
		...(groups.exif ? EXIF_KEYS : []),
	];
}

/**
 * @param {string} key
 * @param {*}      value Form value.
 * @return {*} The value as the gallery row stores it.
 */
function toRowValue(key, value) {
	if (NUMERIC_KEYS.has(key)) {
		return Number(value) || 0;
	}
	if (key === ITEM_CSS_CLASS_KEY) {
		return sanitizeItemCssClass(value);
	}
	return value ?? '';
}

/**
 * @param {*} value
 * @return {string} The form's text for comparison.
 */
function asFieldText(value) {
	return value === null || value === undefined ? '' : String(value);
}

/**
 * @param {Object} row
 * @param {Object} edited The edited tile, before the edit.
 * @return {boolean} `row` shows the same attachment as `edited`.
 */
function isSameAttachment(row, edited) {
	if (!row || typeof row !== 'object' || isEmbeddedGalleryItemRow(row)) {
		return false;
	}
	const id = Number(row.id);
	return Number.isFinite(id) && id > 0 && id === Number(edited.id);
}

/**
 * The row patch for the form fields that differ from the tile.
 *
 * @param {Object}                      row
 * @param {Object}                      values Form values (title, alt, description, …).
 * @param {ImageMetadataEditableGroups} groups
 * @return {Object} Changed row fields; empty when the form matches the tile.
 */
function changedRowFields(row, values, groups) {
	const shown = defaultImageMetadataValuesFromItem(row);
	const patch = {};
	for (const key of editableKeys(groups)) {
		if (!Object.prototype.hasOwnProperty.call(values, key)) {
			continue;
		}
		if (asFieldText(values[key]) === asFieldText(shown[key])) {
			continue;
		}
		patch[key] = toRowValue(key, values[key]);
	}
	// The preview shows `caption`; the row stores `description`.
	if (Object.prototype.hasOwnProperty.call(patch, 'description')) {
		patch.caption = patch.description;
	}
	return patch;
}

/**
 * @param {Object} row   Tile with the patch applied.
 * @param {Object} patch
 * @return {Object} The tile with the playback URL and poster the canvas reads.
 */
function withVideoDisplayFields(row, patch) {
	const videoChanged =
		Object.prototype.hasOwnProperty.call(patch, 'video_url') ||
		Object.prototype.hasOwnProperty.call(patch, 'video_thumbnail');
	if (!videoChanged) {
		return row;
	}
	// The bootstrap derives `videoUrl` / `videoSrc` from `video_url`, and the
	// canvas prefers them: keep them in step instead of refetching it.
	const playbackUrl = String(row.video_url ?? '').trim();
	return applyVideoTemplateDisplayFieldsToPreviewItem(
		{ ...row, videoUrl: playbackUrl, videoSrc: playbackUrl },
		{ video_url: row.video_url, video_thumbnail: row.video_thumbnail }
	);
}

/**
 * Apply the Image panel's values to the tile at `coreIndex`. Title, alt and
 * caption belong to the attachment, so every tile of that attachment takes
 * them (the save writes each row's text to the attachment in order; a stale
 * duplicate would otherwise win). Other fields change that tile only.
 *
 * @param {Object[]}                    catalog   Preview catalog (gallery items, display order).
 * @param {number}                      coreIndex The edited tile.
 * @param {Object}                      values    Image panel form values.
 * @param {ImageMetadataEditableGroups} groups    Field groups this gallery may edit.
 * @return {Object[]} The changed catalog, or `catalog` itself when nothing differs.
 */
export function applyImageMetadataEditToCatalog(
	catalog,
	coreIndex,
	values,
	groups
) {
	const edited = Array.isArray(catalog) ? catalog[coreIndex] : null;
	if (!edited || typeof edited !== 'object' || !values) {
		return catalog;
	}
	const patch = changedRowFields(edited, values, groups);
	if (Object.keys(patch).length === 0) {
		return catalog;
	}
	const attachmentText = {};
	for (const key of [...ATTACHMENT_TEXT_KEYS, 'caption']) {
		if (Object.prototype.hasOwnProperty.call(patch, key)) {
			attachmentText[key] = patch[key];
		}
	}
	const sharesText = Object.keys(attachmentText).length > 0;
	return catalog.map((row, index) => {
		if (index === coreIndex) {
			return withVideoDisplayFields({ ...row, ...patch }, patch);
		}
		if (sharesText && isSameAttachment(row, edited)) {
			return { ...row, ...attachmentText };
		}
		return row;
	});
}
