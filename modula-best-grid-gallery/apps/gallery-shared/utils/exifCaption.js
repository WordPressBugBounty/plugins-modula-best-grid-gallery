/**
 * The EXIF line for the settings-editor lightbox preview.
 *
 * The visitor gets this HTML from Pro on the server (`captionExtraHtml`,
 * `modula_build_exif_caption_html()`), built from the saved settings. The
 * editor preview builds it here from the current form values so it follows
 * "Show shooting data" and the field toggles before they are saved. Keep the
 * field order, the skipped values, the value formats and the markup in step
 * with the Pro helper; `exifCaption.parity.json` holds the cases both check.
 *
 * @package
 */

import { isLightboxToggleOn } from './lightboxSettingsToFancyboxOpts';

/**
 * Row field → grouped `exif` setting, in the order the line lists them (the
 * order of the EXIF toggles). `skip` holds the stored values that mean
 * "no data" besides '' and 'N/A'.
 */
const EXIF_CAPTION_FIELDS = [
	{ field: 'exif_camera', setting: 'exifCamera', skip: [] },
	{ field: 'exif_lens', setting: 'exifLens', skip: [] },
	{ field: 'exif_shutter_speed', setting: 'exifShutterSpeed', skip: ['sec'] },
	{ field: 'exif_aperture', setting: 'exifAperture', skip: [] },
	{ field: 'exif_focal_length', setting: 'exifFocalLength', skip: [] },
	{ field: 'exif_iso', setting: 'exifIso', skip: [] },
	{ field: 'exif_date', setting: 'exifDate', skip: ['0'] },
];

/** Row fields the preview row keeps for {@link buildExifCaptionHtml}. */
export const EXIF_ROW_FIELDS = EXIF_CAPTION_FIELDS.map(({ field }) => field);

const SHUTTER_PATTERN = /^(\d+(?:[./]\d+)?)\s*(?:s|sec)?$/i;
const ISO_PATTERN = /^\d+$/;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})(?:[ T]\d{2}:\d{2}(?::\d{2})?)?$/;

/**
 * @param {string} text Plain text.
 * @return {string} The text, escaped for HTML.
 */
function escapeHtml(text) {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}

/**
 * A stored "Y-m-d" or "Y-m-d H:i" date as "12 Mar 2026"; any other text as is.
 *
 * @param {string}   text   Stored date.
 * @param {string[]} months Twelve month abbreviations, January first.
 * @return {string} The date to show.
 */
function formatExifDate(text, months) {
	const parts = DATE_PATTERN.exec(text);
	if (!parts) {
		return text;
	}
	const month = Number(parts[2]);
	const day = Number(parts[3]);
	if (month < 1 || month > 12 || day < 1 || day > 31) {
		return text;
	}
	return `${day} ${months[month - 1]} ${parts[1]}`;
}

/**
 * The text one field shows, as `modula_exif_caption_value()`: "1/250" →
 * "1/250s", "200" → "ISO 200", a stored date → "12 Mar 2026"; anything else
 * as stored.
 *
 * @param {string}   field  Row field.
 * @param {unknown}  value  Stored row value.
 * @param {string[]} skip   Field-specific "no data" values.
 * @param {string[]} months Twelve month abbreviations, January first.
 * @return {string} The text to show, or '' when there is none.
 */
function exifDisplayValue(field, value, skip, months) {
	if (typeof value !== 'string' && !Number.isInteger(value)) {
		return '';
	}
	const text = String(value).trim();
	if (text === '' || text === 'N/A' || skip.includes(text)) {
		return '';
	}
	switch (field) {
		case 'exif_shutter_speed': {
			const parts = SHUTTER_PATTERN.exec(text);
			return parts ? `${parts[1]}s` : text;
		}
		case 'exif_iso':
			return ISO_PATTERN.test(text) ? `ISO ${text}` : text;
		case 'exif_date':
			return formatExifDate(text, months);
		default:
			return text;
	}
}

/**
 * @typedef {Object} ExifCaptionConfig From Pro (`exifCaption` in the editor config); missing while the EXIF extension is off.
 * @property {string}   icon   The line's camera icon SVG.
 * @property {string[]} months The site's twelve short month names, January first.
 */

/**
 * @param {Record<string, unknown>|null|undefined} row          Item row with `exif_*` fields.
 * @param {Object|null|undefined}                  exifSettings Grouped `exif` settings.
 * @param {ExifCaptionConfig|null|undefined}       config       Icon and month names from Pro.
 * @return {string} HTML fragment, empty when nothing is shown.
 */
export function buildExifCaptionHtml(row, exifSettings, config) {
	if (
		!row ||
		typeof config?.icon !== 'string' ||
		!Array.isArray(config.months) ||
		!isLightboxToggleOn(exifSettings?.enableExif)
	) {
		return '';
	}

	const values = [];
	for (const { field, setting, skip } of EXIF_CAPTION_FIELDS) {
		if (!isLightboxToggleOn(exifSettings[setting])) {
			continue;
		}
		const value = exifDisplayValue(field, row[field], skip, config.months);
		if (value !== '') {
			values.push(escapeHtml(value));
		}
	}

	if (values.length === 0) {
		return '';
	}
	return `<div class="modula-exif">${config.icon}<span>${values.join(' · ')}</span></div>`;
}
