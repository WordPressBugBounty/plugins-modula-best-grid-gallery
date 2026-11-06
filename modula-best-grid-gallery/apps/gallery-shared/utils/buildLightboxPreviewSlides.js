/**
 * Build Fancybox slide payloads for the settings-editor lightbox preview.
 *
 * @package
 */

import { buildExifCaptionHtml } from './exifCaption';
import { mergeLightboxCaptionWithExtra } from './lightboxCaptionExtra';
import { isLightboxToggleOn } from './lightboxSettingsToFancyboxOpts';
import { sanitizeCaptionHtml } from './sanitizeCaptionHtml';

/**
 * @param {string} text
 * @return {string}
 */
function escapeHtml(text) {
	return String(text)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

/**
 * The title is plain text; the description is caption HTML, as on grid tiles
 * and the classic lightbox's `data-caption`.
 *
 * @param {{ title?: string, description?: string }} row
 * @param {Object}                                   lightboxSettings
 * @return {string}
 */
export function buildLightboxPreviewCaption(row, lightboxSettings) {
	const showTitle = isLightboxToggleOn(lightboxSettings?.showTitle);
	const showCaption = isLightboxToggleOn(lightboxSettings?.showCaption);
	const title = typeof row.title === 'string' ? row.title.trim() : '';
	const description =
		typeof row.description === 'string' ? row.description.trim() : '';

	const parts = [];
	if (showTitle && title) {
		parts.push(
			`<span class="modula-caption-title">${escapeHtml(title)}</span>`
		);
	}
	if (showCaption && description) {
		parts.push(
			`<span class="modula-caption-description">${sanitizeCaptionHtml(description)}</span>`
		);
	}
	return parts.join('<br>');
}

/**
 * @param {import('./collectGalleryImageRowsForLightboxPreview').LightboxPreviewImageRow[]} rows
 * @param {Object}                                                                          settings              Grouped gallery settings.
 * @param {{ exifCaption?: import('./exifCaption').ExifCaptionConfig }}                     [options]
 * @param {import('./exifCaption').ExifCaptionConfig}                                       [options.exifCaption] The EXIF line's icon and month names, from Pro; without it no EXIF is shown.
 * @return {Array<{ src: string, opts: { caption?: string, alt?: string, thumb?: string } }>}
 */
export function buildLightboxPreviewSlides(rows, settings, options = {}) {
	const lightbox = settings?.lightbox || {};
	return rows.map((row) => ({
		src: row.src,
		opts: {
			// EXIF follows the caption, as the visitor's `captionExtraHtml` does.
			caption: mergeLightboxCaptionWithExtra(
				buildLightboxPreviewCaption(row, lightbox),
				buildExifCaptionHtml(
					row.exif,
					settings?.exif,
					options.exifCaption
				)
			),
			alt: row.alt,
			thumb: row.thumb || row.src,
		},
	}));
}
