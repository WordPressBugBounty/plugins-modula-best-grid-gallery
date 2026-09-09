/**
 * Image licensing helpers for the React gallery (v2 bootstrap).
 *
 * @package
 */
import { __, sprintf } from '@wordpress/i18n';

/**
 * @param {*} val
 * @returns {boolean}
 */
export function licensingTruthy(val) {
	if (val === true || val === 1 || val === '1') {
		return true;
	}
	if (typeof val === 'string' && val.toLowerCase().trim() === 'true') {
		return true;
	}
	return false;
}

/**
 * @param {Object} metadata Gallery bootstrap metadata.
 * @returns {boolean}
 */
export function isImageLicensingExtensionActive(metadata) {
	return licensingTruthy(metadata?.imageLicensingExtensionActive);
}

/**
 * @param {Object} settings Grouped v2 settings.
 * @returns {string}
 */
export function getGalleryLicenseKey(settings) {
	const licensing = settings?.licensing || {};
	const key =
		typeof licensing.imageLicensing === 'string'
			? licensing.imageLicensing.trim()
			: '';
	return key || 'none';
}

/**
 * Resolve per-image override vs gallery default.
 *
 * @param {Object} settings Grouped settings.
 * @param {Object} [item]    Gallery item row.
 * @returns {string}
 */
export function resolveEffectiveLicenseKey(settings, item) {
	const itemKey =
		typeof item?.image_licensing === 'string'
			? item.image_licensing.trim()
			: '';
	if (itemKey && itemKey !== 'none') {
		return itemKey;
	}
	return getGalleryLicenseKey(settings);
}

/**
 * @param {Object} catalog License catalog from metadata.
 * @param {string} key     License key or CPT id.
 * @returns {Object|null}
 */
export function getLicenseEntry(catalog, key) {
	if (!catalog || typeof catalog !== 'object' || !key || key === 'none') {
		return null;
	}
	const entry = catalog[key];
	if (!entry || typeof entry !== 'object') {
		return null;
	}
	return entry;
}

/**
 * Pro extension gates display toggles; license type can still be read for editor preview.
 *
 * @param {Object} settings  Grouped settings.
 * @param {Object} metadata  Bootstrap metadata.
 * @returns {boolean}
 */
export function shouldShowLicenseBox(settings, metadata) {
	const type = String(settings?.general?.type || '').trim();
	if (type === 'video') {
		return false;
	}
	if (!licensingTruthy(settings?.licensing?.displayWithDescription)) {
		return false;
	}
	if (!isImageLicensingExtensionActive(metadata)) {
		return false;
	}
	const key = getGalleryLicenseKey(settings);
	return key !== 'none' && !!getLicenseEntry(metadata?.licenseCatalog, key);
}

/**
 * @param {Object} settings Grouped settings.
 * @param {Object} metadata Bootstrap metadata.
 * @returns {boolean}
 */
export function shouldShowLicenseInLightbox(settings, metadata) {
	if (!licensingTruthy(settings?.licensing?.showOnLightbox)) {
		return false;
	}
	if (!isImageLicensingExtensionActive(metadata)) {
		return false;
	}
	return true;
}

/**
 * HTML caption fragment for Fancybox (matches Pro `caption_license` markup).
 *
 * @param {Object} entry License catalog entry.
 * @returns {string}
 */
export function buildLicenseCaptionHtml(entry) {
	if (!entry || typeof entry !== 'object') {
		return '';
	}
	const name = typeof entry.name === 'string' ? entry.name : '';
	const licenseUrl =
		typeof entry.license === 'string' ? entry.license.trim() : '';
	const imageUrl = typeof entry.image === 'string' ? entry.image.trim() : '';
	if (!licenseUrl && !name) {
		return '';
	}
	const img = imageUrl
		? `<img alt="${escapeHtmlAttr(name)}" style="border-width:0" src="${escapeHtmlAttr(imageUrl)}" />`
		: '';
	const label = sprintf(
		/* translators: %s: license name */
		__('This work is licensed under a %s', 'modula-best-grid-gallery'),
		name
	);
	return (
		`<div class="modula-image-licensing-caption-wrap">` +
		`<a class="modula-image-licensing-caption" rel="license" href="${escapeHtmlAttr(licenseUrl)}" target="_blank">` +
		img +
		`<span>${escapeHtml(label)}</span>` +
		`</a></div>`
	);
}

/**
 * @param {string} caption Base caption HTML/text.
 * @param {string} licensingHtml Licensing fragment.
 * @returns {string}
 */
export function mergeLightboxCaptionWithLicensing(caption, licensingHtml) {
	const base = typeof caption === 'string' ? caption : '';
	const extra = typeof licensingHtml === 'string' ? licensingHtml : '';
	if (!extra) {
		return base;
	}
	if (!base) {
		return extra;
	}
	if (base.includes('modula-image-licensing-caption-wrap')) {
		return base;
	}
	return base + extra;
}

/**
 * @param {string} value
 * @returns {string}
 */
function escapeHtmlAttr(value) {
	return String(value)
		.replace(/&/g, '&amp;')
		.replace(/"/g, '&quot;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');
}

/**
 * @param {string} value
 * @returns {string}
 */
function escapeHtml(value) {
	return String(value)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');
}
