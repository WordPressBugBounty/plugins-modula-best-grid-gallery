import { captionToPlainString } from '../../utils/captionToPlainString';

export const SLOT_IDS = /** @type {const} */ (['title', 'caption', 'social']);

const DEFAULT_SLOT_POSITIONS = {
	title: { x: 50, y: 18 },
	caption: { x: 50, y: 50 },
	social: { x: 50, y: 82 },
};

/**
 * @param {unknown} value
 * @returns {boolean}
 */
export function isEnabledFlag(value) {
	return value === true || value === 1 || value === '1';
}

/**
 * @param {unknown} value
 * @param {number} fallback
 * @returns {number}
 */
function normalizePercent(value, fallback) {
	const n = Number(value);
	if (!Number.isFinite(n)) {
		return fallback;
	}
	return Math.min(100, Math.max(0, Math.round(n)));
}

/**
 * Title/caption for hover chips: same normalization as image metadata, strip tags for chip display.
 *
 * @param {unknown} value
 * @returns {string}
 */
export function chipPlainPreviewText(value) {
	const s = captionToPlainString(value).trim();
	if (!s) {
		return '';
	}
	return s
		.replace(/<[^>]+>/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

/**
 * Read camelCase props; fall back to legacy lowercase (older PHP sanitizer used sanitize_key on object keys).
 *
 * @param {Record<string, unknown>} builder
 * @param {string} camel
 * @returns {unknown}
 */
export function readHoverBuilderKey(builder, camel) {
	if (!builder || typeof builder !== 'object') {
		return undefined;
	}
	if (Object.prototype.hasOwnProperty.call(builder, camel)) {
		return builder[camel];
	}
	const lower =
		camel.charAt(0).toLowerCase() +
		camel.slice(1).replace(/[A-Z]/g, (c) => c.toLowerCase());
	if (
		lower !== camel &&
		Object.prototype.hasOwnProperty.call(builder, lower)
	) {
		return builder[lower];
	}
	return undefined;
}

/** @return {Record<string, { x: number, y: number }>} */
export function mergeSlotPositions(builder) {
	const rawSlot = readHoverBuilderKey(builder, 'slotPositions');
	const raw =
		rawSlot && typeof rawSlot === 'object' && !Array.isArray(rawSlot)
			? rawSlot
			: {};
	const out = { ...DEFAULT_SLOT_POSITIONS };
	for (const id of SLOT_IDS) {
		const cell = raw[id];
		if (cell && typeof cell === 'object') {
			out[id] = {
				x: normalizePercent(cell.x, DEFAULT_SLOT_POSITIONS[id].x),
				y: normalizePercent(cell.y, DEFAULT_SLOT_POSITIONS[id].y),
			};
		}
	}
	return out;
}

/**
 * Typography from Captions & titles settings for WYSIWYG hover builder chips.
 *
 * @param {Record<string, unknown> | null | undefined} captions
 * @param {'title' | 'caption'} role
 * @returns {import('react').CSSProperties | undefined}
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
