/**
 * Build Fancybox slide payloads for the settings-editor lightbox preview.
 *
 * @package
 */

import { isLightboxToggleOn } from './lightboxSettingsToFancyboxOpts';

/**
 * @param {string} text
 * @returns {string}
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
 * @param {{ title?: string, description?: string }} row
 * @param {Object} lightboxSettings
 * @returns {string}
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
			`<span class="modula-caption-description">${escapeHtml(description)}</span>`
		);
	}
	return parts.join('<br>');
}

/**
 * @param {import('./collectGalleryImageRowsForLightboxPreview').LightboxPreviewImageRow[]} rows
 * @param {Object} settings Grouped gallery settings.
 * @returns {Array<{ src: string, opts: { caption?: string, alt?: string, thumb?: string } }>}
 */
export function buildLightboxPreviewSlides(rows, settings) {
	const lightbox = settings?.lightbox || {};
	return rows.map((row) => ({
		src: row.src,
		opts: {
			caption: buildLightboxPreviewCaption(row, lightbox),
			alt: row.alt || row.title || '',
			thumb: row.thumb || row.src,
		},
	}));
}
