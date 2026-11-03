import { captionToPlainString } from '../../utils/captionToPlainString';

/**
 * Caption Preview/Build slot markup: same payload normalization as titles, keep tags
 * so the slot can match visitor description HTML (`<strong>`, `<br />`, …).
 *
 * @param {unknown} value Caption or description from REST/bootstrap.
 * @return {string} Markup string for the caption slot (may be empty).
 */
export function chipCaptionPreviewHtml(value) {
	return captionToPlainString(value).trim();
}

/**
 * Title chip copy: same normalization as image metadata, strip tags (title is plain text).
 *
 * @param {unknown} value Title from REST/bootstrap.
 * @return {string} Tag-stripped plain text for the title slot (may be empty).
 */
export function chipPlainPreviewText(value) {
	const s = chipCaptionPreviewHtml(value);
	if (!s) {
		return '';
	}
	return s
		.replace(/<[^>]+>/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

/**
 * Typography from Captions & titles settings for WYSIWYG hover builder chips.
 *
 * @param {Record<string, unknown> | null | undefined} captions
 * @param {'title' | 'caption'}                        role
 * @return {import('react').CSSProperties | undefined}
 */
export function getCaptionsTypographyStyle(captions, role) {
	if (!captions || typeof captions !== 'object') {
		return undefined;
	}
	/** @type {import('react').CSSProperties} */
	const style = {};
	if (role === 'title') {
		const fs = Number(captions.titleFontSize);
		if (Number.isFinite(fs) && fs > 0) {
			style.fontSize = `${Math.round(fs)}px`;
		}
		const color =
			typeof captions.titleColor === 'string'
				? captions.titleColor.trim()
				: '';
		if (color) {
			style.color = color;
		}
		const fw = captions.titleFontWeight;
		if (typeof fw === 'string' && fw && fw !== 'default') {
			style.fontWeight = fw;
		}
		return Object.keys(style).length ? style : undefined;
	}
	const fs = Number(captions.captionFontSize);
	if (Number.isFinite(fs) && fs > 0) {
		style.fontSize = `${Math.round(fs)}px`;
	}
	const color =
		typeof captions.captionColor === 'string'
			? captions.captionColor.trim()
			: '';
	if (color) {
		style.color = color;
	}
	const fw = captions.captionFontWeight;
	if (typeof fw === 'string' && fw && fw !== 'normal') {
		style.fontWeight = fw;
	}
	return Object.keys(style).length ? style : undefined;
}
