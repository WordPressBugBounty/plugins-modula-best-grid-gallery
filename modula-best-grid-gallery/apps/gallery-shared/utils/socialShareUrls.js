/**
 * Build share URLs for tile social icons (parity with legacy jquery-modula.js).
 *
 * @package
 */

import { normalizeDeeplinkPrefix } from '../lightbox/modulaDeeplinkFromHash';

/**
 * @param {Object} options
 * @param {string|number} options.itemId
 * @param {string|number} options.galleryId
 * @param {string}        [options.imageUrl]
 * @param {string}        [options.pageUrl]
 * @param {string}        [options.emailSubject]
 * @param {string}        [options.emailMessage]
 * @param {boolean}       [options.deeplinkEnabled]
 * @param {string}        [options.deeplinkPrefix]
 * @param {number}        [options.deeplinkIndex] 0-based index among shareable gallery images
 * @return {string}
 */
export function buildModulaSharePageUrl(options = {}) {
	const base =
		typeof options.pageUrl === 'string' && options.pageUrl
			? options.pageUrl
			: typeof window !== 'undefined'
				? window.location.href
				: '';
	if (!base) {
		return '';
	}
	try {
		const urlObj = new URL(base);
		const params = new URLSearchParams(urlObj.search);
		if (options.galleryId !== undefined && options.galleryId !== null) {
			params.set('modula_gallery_id', String(options.galleryId));
		}
		if (options.itemId !== undefined && options.itemId !== null) {
			params.set('modula_image_id', String(options.itemId));
		}
		if (
			options.deeplinkEnabled &&
			options.galleryId !== undefined &&
			options.galleryId !== null &&
			typeof options.deeplinkIndex === 'number' &&
			options.deeplinkIndex >= 0
		) {
			const prefix =
				normalizeDeeplinkPrefix(options.deeplinkPrefix) ||
				'modulagallery';
			const galleryId = String(options.galleryId).replace(/^jtg-?/, '');
			params.set(
				'modula_deeplink',
				`#${prefix}-${galleryId}-${options.deeplinkIndex + 1}`
			);
		}
		if (
			typeof window !== 'undefined' &&
			window.modulaMetaVars &&
			typeof window.modulaMetaVars === 'object'
		) {
			Object.values(window.modulaMetaVars).forEach((paramName) => {
				if (typeof paramName === 'string' && paramName) {
					params.set(paramName, '');
				}
			});
		}
		if (typeof document !== 'undefined') {
			document.dispatchEvent(
				new CustomEvent('modula_social_url_params', {
					detail: {
						url: urlObj,
						params,
						meta: window.modulaMetaVars,
					},
				})
			);
		}
		return `${urlObj.origin}${urlObj.pathname}?${decodeURIComponent(params.toString())}`;
	} catch {
		return base;
	}
}

/**
 * @param {'facebook'|'twitter'|'whatsapp'|'pinterest'|'linkedin'|'email'} type
 * @param {Object} options
 * @return {string}
 */
export function getSocialShareUrl(type, options = {}) {
	const shareUrl = buildModulaSharePageUrl(options);
	const imageUrl = options.imageUrl || '';
	const title = options.title || '';
	const emailSubject = options.emailSubject || '';
	const emailMessage = options.emailMessage || '';

	switch (type) {
		case 'facebook':
			return `https://www.facebook.com/sharer.php?u=${encodeURIComponent(shareUrl)}`;
		case 'twitter':
			return `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(title)}`;
		case 'whatsapp':
			return `https://api.whatsapp.com/send?text=${encodeURIComponent(`${title} ${shareUrl}`.trim())}`;
		case 'pinterest':
			return `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(shareUrl)}&media=${encodeURIComponent(imageUrl)}&description=${encodeURIComponent(title)}`;
		case 'linkedin':
			return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
		case 'email': {
			const body = emailMessage
				.replace(/%%image_link%%/g, shareUrl)
				.replace(/%%gallery_link%%/g, shareUrl);
			return `mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(body)}`;
		}
		default:
			return '#';
	}
}
