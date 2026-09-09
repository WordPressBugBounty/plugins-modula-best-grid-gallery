/**
 * Defaults + contrast helpers for v2 content_block tiles (editor + front).
 *
 * @package
 */

/** Cleared / transparent tile fill. Empty string is the stored form of “no solid tint”. */
export const DEFAULT_CONTENT_BLOCK_BACKGROUND = '';

/**
 * Persisted create fill for Add new → Content block (not a migration of existing rows).
 * Mid-tone rgba so a fresh block is visible on both light and dark editor chrome.
 */
export const CONTENT_BLOCK_CREATE_DEFAULT_BACKGROUND = 'rgba(232, 234, 237, 1)';

/** Create span (custom-grid units / justified aspect) for Add new → Content block. */
export const CONTENT_BLOCK_CREATE_DEFAULT_WIDTH = 4;
export const CONTENT_BLOCK_CREATE_DEFAULT_HEIGHT = 2;

/** @deprecated Kept for older call sites that still expect a solid demo yellow. Prefer ''. */
export const LEGACY_CONTENT_BLOCK_DEMO_BACKGROUND = '#ffd43b';

function expandShortHex(h) {
	if (h.length === 3) {
		return h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
	}
	return h;
}

/**
 * @param {string} hex `#rgb` or `#rrggbb`
 * @return {{ r: number, g: number, b: number } | null} RGB or null if invalid.
 */
function parseRgb(hex) {
	const raw = String(hex || '')
		.trim()
		.replace(/^#/, '');
	if (!raw) {
		return null;
	}
	const h = raw.length === 3 ? expandShortHex(raw) : raw;
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
 * @param {number} s 0–255
 * @return {number} Linearized sRGB channel.
 */
function linearizeChannel(s) {
	const c = s / 255;
	return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/**
 * @param {{ r: number, g: number, b: number }} rgb
 * @return {number}
 */
function relativeLuminance(rgb) {
	return (
		0.2126 * linearizeChannel(rgb.r) +
		0.7152 * linearizeChannel(rgb.g) +
		0.0722 * linearizeChannel(rgb.b)
	);
}

/**
 * @param {number} a
 * @param {number} b
 * @return {number}
 */
function contrastRatioFromLuminance(a, b) {
	const light = Math.max(a, b);
	const dark = Math.min(a, b);
	return (light + 0.05) / (dark + 0.05);
}

/**
 * @param {{ r: number, g: number, b: number }} from
 * @param {{ r: number, g: number, b: number }} to
 * @param {number} amount 0..1
 * @return {{ r: number, g: number, b: number }}
 */
function mixRgb(from, to, amount) {
	const t = Math.max(0, Math.min(1, amount));
	return {
		r: Math.round(from.r + (to.r - from.r) * t),
		g: Math.round(from.g + (to.g - from.g) * t),
		b: Math.round(from.b + (to.b - from.b) * t),
	};
}

/**
 * @param {{ r: number, g: number, b: number }} rgb
 * @return {string}
 */
function rgbToHex(rgb) {
	return `#${[rgb.r, rgb.g, rgb.b]
		.map((n) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0'))
		.join('')}`;
}

/**
 * Generates a lightweight text color scheme for a given background.
 * Keeps some hue relation with the background while preserving readability.
 *
 * @param {string} bgHex Background `#rgb` or `#rrggbb`.
 * @return {string[]} Suggested text colors (best first).
 */
export function contentBlockTextColorPaletteForBackground(bgHex) {
	const bg = parseRgb(bgHex);
	if (!bg) {
		return ['#ffffff', '#111111'];
	}
	const bgL = relativeLuminance(bg);
	const darkInk = parseRgb('#111827');
	const lightInk = parseRgb('#f9fafb');
	const prefersDarkText = bgL > 0.45;
	const anchors = prefersDarkText
		? [darkInk, parseRgb('#111111')]
		: [lightInk, parseRgb('#ffffff')];
	const mixLevels = prefersDarkText
		? [0.86, 0.78, 0.7, 0.62]
		: [0.86, 0.78, 0.7, 0.62];

	/** @type {string[]} */
	const out = [];
	for (const anchor of anchors) {
		if (!anchor) {
			continue;
		}
		for (const mixLevel of mixLevels) {
			const candidate = mixRgb(bg, anchor, mixLevel);
			const candidateL = relativeLuminance(candidate);
			if (contrastRatioFromLuminance(bgL, candidateL) < 4.5) {
				continue;
			}
			const hex = rgbToHex(candidate);
			if (!out.includes(hex)) {
				out.push(hex);
			}
		}
	}

	// Hard safety net.
	if (out.length === 0) {
		const black = parseRgb('#111111');
		const white = parseRgb('#ffffff');
		const blackRatio = contrastRatioFromLuminance(
			bgL,
			relativeLuminance(black)
		);
		const whiteRatio = contrastRatioFromLuminance(
			bgL,
			relativeLuminance(white)
		);
		return blackRatio >= whiteRatio
			? ['#111111', '#ffffff']
			: ['#ffffff', '#111111'];
	}

	return out.slice(0, 4);
}

/**
 * Relative luminance → pick readable foreground on solid backgrounds.
 *
 * @param {string} hex Background `#rgb` or `#rrggbb`
 * @return {string} High-contrast text color, derived from a generated scheme.
 */
export function contrastingForegroundForBackground(hex) {
	const rgb = parseRgb(hex);
	if (!rgb) {
		/* Transparent / missing / rgba — prefer dark ink on light artboard. */
		return '#1d2327';
	}
	return contentBlockTextColorPaletteForBackground(hex)[0] || '#ffffff';
}

/**
 * Pure black/white ink for photo tiles (hue-mixed Auto looks washed over images).
 *
 * @param {string} hex Background / overlay hex.
 * @return {string}
 */
export function solidContrastingForegroundForBackground(hex) {
	const bg = parseRgb(hex);
	if (!bg) {
		return '#111111';
	}
	return relativeLuminance(bg) > 0.45 ? '#111111' : '#ffffff';
}
