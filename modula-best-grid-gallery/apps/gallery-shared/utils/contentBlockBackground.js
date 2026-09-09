/**
 * Content block tile background image + color overlay helpers (editor + front).
 *
 * @package
 */

/** Default overlay strength when a background image is set (0–100). */
export const DEFAULT_BLOCK_BACKGROUND_OVERLAY_OPACITY = 45;

/** @type {readonly string[]} */
export const BLOCK_BACKGROUND_SIZE_PRESETS = Object.freeze([
	'cover',
	'contain',
	'auto',
]);

/** @type {readonly string[]} */
export const BLOCK_BACKGROUND_POSITION_PRESETS = Object.freeze([
	'center',
	'top',
	'bottom',
	'left',
	'right',
	'top left',
	'top right',
	'bottom left',
	'bottom right',
]);

/** @type {readonly string[]} */
export const BLOCK_BACKGROUND_REPEAT_PRESETS = Object.freeze([
	'no-repeat',
	'repeat',
	'repeat-x',
	'repeat-y',
]);

export const DEFAULT_BLOCK_BACKGROUND_SIZE = 'cover';
export const DEFAULT_BLOCK_BACKGROUND_POSITION = 'center';
export const DEFAULT_BLOCK_BACKGROUND_REPEAT = 'no-repeat';

/**
 * @param {unknown} raw
 * @return {number} Positive attachment ID or 0.
 */
export function normalizeBlockBackgroundImageId(raw) {
	const n = parseInt(String(raw ?? ''), 10);
	return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * @param {unknown} raw
 * @return {number} Clamped 0–100.
 */
export function normalizeBlockBackgroundOverlayOpacity(raw) {
	const n = Number(raw);
	if (!Number.isFinite(n)) {
		return DEFAULT_BLOCK_BACKGROUND_OVERLAY_OPACITY;
	}
	return Math.max(0, Math.min(100, Math.round(n)));
}

/**
 * @param {unknown} raw
 * @param {readonly string[]} allowed
 * @param {string} fallback
 * @return {string}
 */
function normalizePreset(raw, allowed, fallback) {
	const value = String(raw || '')
		.trim()
		.toLowerCase();
	return allowed.includes(value) ? value : fallback;
}

/**
 * @param {unknown} raw
 * @return {string}
 */
export function normalizeBlockBackgroundSize(raw) {
	return normalizePreset(
		raw,
		BLOCK_BACKGROUND_SIZE_PRESETS,
		DEFAULT_BLOCK_BACKGROUND_SIZE
	);
}

/**
 * @param {unknown} raw
 * @return {string}
 */
export function normalizeBlockBackgroundPosition(raw) {
	return normalizePreset(
		raw,
		BLOCK_BACKGROUND_POSITION_PRESETS,
		DEFAULT_BLOCK_BACKGROUND_POSITION
	);
}

/**
 * @param {unknown} raw
 * @return {string}
 */
export function normalizeBlockBackgroundRepeat(raw) {
	return normalizePreset(
		raw,
		BLOCK_BACKGROUND_REPEAT_PRESETS,
		DEFAULT_BLOCK_BACKGROUND_REPEAT
	);
}

/**
 * @param {string} hex `#rgb` or `#rrggbb`
 * @return {{ r: number, g: number, b: number } | null}
 */
function parseHexRgb(hex) {
	const raw = String(hex || '')
		.trim()
		.replace(/^#/, '');
	if (!raw) {
		return null;
	}
	const h =
		raw.length === 3
			? raw[0] + raw[0] + raw[1] + raw[1] + raw[2] + raw[2]
			: raw;
	if (!/^[0-9a-fA-F]{6}$/.test(h)) {
		return null;
	}
	return {
		r: parseInt(h.slice(0, 2), 16),
		g: parseInt(h.slice(2, 4), 16),
		b: parseInt(h.slice(4, 6), 16),
	};
}

/**
 * @param {string} hex
 * @param {number} opacityPct 0–100
 * @return {string} `rgba(...)` or empty when hex invalid.
 */
export function hexToRgba(hex, opacityPct) {
	const rgb = parseHexRgb(hex);
	if (!rgb) {
		return '';
	}
	const a = Math.max(0, Math.min(100, Number(opacityPct) || 0)) / 100;
	return `rgba(${rgb.r},${rgb.g},${rgb.b},${a})`;
}

/**
 * @param {string} raw Hex `#rgb`/`#rrggbb` or `rgb()`/`rgba()`.
 * @return {{ r: number, g: number, b: number, a: number } | null}
 */
function parseCssColorChannels(raw) {
	const value = String(raw || '').trim();
	if (!value || value.toLowerCase() === 'transparent') {
		return null;
	}
	const hex = parseHexRgb(value);
	if (hex) {
		return { ...hex, a: 1 };
	}
	const m = value.match(
		/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*([0-9]*\.?[0-9]+))?\s*\)$/i
	);
	if (!m) {
		return null;
	}
	const a =
		m[4] !== undefined ? Math.max(0, Math.min(1, parseFloat(m[4]))) : 1;
	return {
		r: Math.max(0, Math.min(255, parseInt(m[1], 10))),
		g: Math.max(0, Math.min(255, parseInt(m[2], 10))),
		b: Math.max(0, Math.min(255, parseInt(m[3], 10))),
		a: Number.isFinite(a) ? a : 1,
	};
}

/**
 * Relative luminance (sRGB) for ink/background decisions.
 *
 * @param {{ r: number, g: number, b: number }} rgb
 * @return {number}
 */
function relativeLuminance(rgb) {
	const lin = (s) => {
		const c = s / 255;
		return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
	};
	return 0.2126 * lin(rgb.r) + 0.7152 * lin(rgb.g) + 0.0722 * lin(rgb.b);
}

/**
 * Settings-editor dark chrome helper: transparent tiles with dark ink need a
 * light “paper” underlay so copy stays readable without changing saved colors.
 *
 * @param {Object}  opts
 * @param {string}  [opts.color] Background color (empty/transparent → candidate).
 * @param {string}  [opts.textColor] Resolved foreground (incl. Auto).
 * @param {boolean} [opts.hasBackgroundImage]
 * @return {boolean}
 */
export function contentBlockNeedsEditorPaperSurface({
	color,
	textColor,
	hasBackgroundImage,
} = {}) {
	if (hasBackgroundImage) {
		return false;
	}
	const bg = parseCssColorChannels(
		typeof color === 'string' ? color.trim() : ''
	);
	if (bg && bg.a >= 0.08) {
		return false;
	}
	const ink = parseCssColorChannels(
		typeof textColor === 'string' ? textColor.trim() : ''
	);
	if (!ink) {
		/* Auto / missing ink for transparent tiles is dark — paper needed. */
		return true;
	}
	return relativeLuminance(ink) < 0.55;
}

/**
 * Build CSS background style for a content block tile.
 *
 * @param {Object}  opts
 * @param {string}  [opts.color]     Background hex/rgba (empty = transparent).
 * @param {string}  [opts.imageUrl]  Resolved attachment URL (empty = solid color only).
 * @param {number}  [opts.opacity]   Overlay opacity 0–100 when image is set (hex colors).
 * @param {string}  [opts.size]
 * @param {string}  [opts.position]
 * @param {string}  [opts.repeat]
 * @return {Object} React/CSS style object.
 */
export function buildContentBlockBackgroundStyle({
	color,
	imageUrl,
	opacity,
	size,
	position,
	repeat,
} = {}) {
	const raw = typeof color === 'string' && color.trim() ? color.trim() : '';
	const channels = parseCssColorChannels(raw);
	const hasColor = Boolean(channels) && channels.a > 0;
	const cssColor = hasColor
		? channels.a < 1
			? `rgba(${channels.r},${channels.g},${channels.b},${channels.a})`
			: raw.startsWith('#')
				? raw
				: `rgb(${channels.r},${channels.g},${channels.b})`
		: '';
	const url = typeof imageUrl === 'string' ? imageUrl.trim() : '';

	if (!url) {
		return {
			backgroundColor: hasColor ? cssColor || raw : 'transparent',
		};
	}

	if (!hasColor) {
		const cssUrl = `url("${url.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}")`;
		return {
			backgroundColor: 'transparent',
			backgroundImage: cssUrl,
			backgroundSize: normalizeBlockBackgroundSize(size),
			backgroundPosition: normalizeBlockBackgroundPosition(position),
			backgroundRepeat: normalizeBlockBackgroundRepeat(repeat),
		};
	}

	const opacityPct = normalizeBlockBackgroundOverlayOpacity(opacity);
	const overlay =
		channels.a < 1
			? `rgba(${channels.r},${channels.g},${channels.b},${channels.a})`
			: hexToRgba(
					`#${channels.r.toString(16).padStart(2, '0')}${channels.g
						.toString(16)
						.padStart(2, '0')}${channels.b
						.toString(16)
						.padStart(2, '0')}`,
					opacityPct
				) || `rgba(${channels.r},${channels.g},${channels.b},0.45)`;
	const cssUrl = `url("${url.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}")`;

	return {
		backgroundColor: cssColor || raw,
		backgroundImage: `linear-gradient(${overlay}, ${overlay}), ${cssUrl}`,
		backgroundSize: normalizeBlockBackgroundSize(size),
		backgroundPosition: normalizeBlockBackgroundPosition(position),
		backgroundRepeat: normalizeBlockBackgroundRepeat(repeat),
	};
}

/**
 * Normalize background fields from a bootstrap / form row.
 *
 * @param {Object} row
 * @return {{
 *   blockBackgroundImageId: number,
 *   blockBackgroundImageUrl: string,
 *   blockBackgroundOverlayOpacity: number,
 *   blockBackgroundSize: string,
 *   blockBackgroundPosition: string,
 *   blockBackgroundRepeat: string,
 * }}
 */
export function normalizeContentBlockBackgroundFields(row) {
	const r = row && typeof row === 'object' ? row : {};
	return {
		blockBackgroundImageId: normalizeBlockBackgroundImageId(
			r.blockBackgroundImageId
		),
		blockBackgroundImageUrl:
			typeof r.blockBackgroundImageUrl === 'string'
				? r.blockBackgroundImageUrl.trim()
				: '',
		blockBackgroundOverlayOpacity: normalizeBlockBackgroundOverlayOpacity(
			r.blockBackgroundOverlayOpacity
		),
		blockBackgroundSize: normalizeBlockBackgroundSize(
			r.blockBackgroundSize
		),
		blockBackgroundPosition: normalizeBlockBackgroundPosition(
			r.blockBackgroundPosition
		),
		blockBackgroundRepeat: normalizeBlockBackgroundRepeat(
			r.blockBackgroundRepeat
		),
	};
}
