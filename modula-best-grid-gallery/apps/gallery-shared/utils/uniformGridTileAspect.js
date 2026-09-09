/**
 * Uniform grid tile shape presets (must match `layout.uniformGridTileAspect` in settings-v2-document.php).
 *
 * @package
 */

/** @type {Record<string, { css: string, ratio: number, label: string }>} */
const PRESETS = {
	square: { css: '1 / 1', ratio: 1, label: '1:1' },
	portrait: { css: '3 / 4', ratio: 3 / 4, label: '3:4' },
	landscape: { css: '4 / 3', ratio: 4 / 3, label: '4:3' },
};

/** Matches `layout.uniformGridTileAspectCustom` schema: 1–20 per part (e.g. 16:9). */
const RATIO_PART_MIN = 1;
const RATIO_PART_MAX = 20;

/**
 * @param {unknown} n
 * @param {number} fallback
 * @return {number}
 */
function sanitizeRatioPart(n, fallback) {
	const v = Math.round(Number(n));
	if (!Number.isFinite(v) || v < RATIO_PART_MIN) {
		return Math.min(RATIO_PART_MAX, Math.max(RATIO_PART_MIN, fallback));
	}
	return Math.min(RATIO_PART_MAX, Math.max(RATIO_PART_MIN, v));
}

/**
 * @param {string|undefined|null} rawAspect   - v2 `layout.uniformGridTileAspect`
 * @param {unknown}                 customDim - v2 `layout.uniformGridTileAspectCustom` { width, height }
 * @return {{ css: string, ratio: number, label: string }}
 */
export function resolveUniformGridTileAspect(rawAspect, customDim) {
	const mode = String(rawAspect || '')
		.trim()
		.toLowerCase();

	if (mode === 'custom') {
		const obj =
			customDim &&
			typeof customDim === 'object' &&
			!Array.isArray(customDim)
				? customDim
				: {};
		const w = sanitizeRatioPart(obj.width, 16);
		const h = sanitizeRatioPart(obj.height, 9);
		return {
			css: `${w} / ${h}`,
			ratio: w / h,
			label: `${w}:${h}`,
		};
	}

	return PRESETS[mode] || PRESETS.square;
}

/**
 * Inline aspect-ratio for grid cells. Safari fails to size cells when SCSS uses
 * `aspect-ratio: var(--modula-uniform-aspect)` (custom property with `w / h`).
 *
 * @param {string|undefined|null} aspectCss e.g. `1 / 1`, `16 / 9`
 * @return {number} Width/height ratio for React `style={{ aspectRatio }}`
 */
export function uniformGridCellAspectRatioNumber(aspectCss) {
	const s = String(aspectCss || '').trim();
	const match = s.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
	if (match) {
		const w = Number(match[1]);
		const h = Number(match[2]);
		if (w > 0 && h > 0) {
			return w / h;
		}
	}
	return PRESETS.square.ratio;
}

/**
 * Numeric aspect ratio for uniform-grid cell inline styles (all presets + custom).
 *
 * @param {Object|null|undefined} config Gallery flat config from settingsToConfig.
 * @return {number}
 */
export function uniformGridCellAspectRatioFromConfig(config) {
	if (
		typeof config?.uniformGridAspectRatio === 'number' &&
		Number.isFinite(config.uniformGridAspectRatio) &&
		config.uniformGridAspectRatio > 0
	) {
		return config.uniformGridAspectRatio;
	}
	const aspectCss =
		typeof config?.uniformGridAspectCss === 'string' &&
		config.uniformGridAspectCss.trim() !== ''
			? config.uniformGridAspectCss.trim()
			: resolveUniformGridTileAspect(null, null).css;
	return uniformGridCellAspectRatioNumber(aspectCss);
}

/**
 * Cell height (px) from measured grid width — Safari-safe alternative to aspect-ratio + var().
 *
 * @param {number} containerWidth
 * @param {number} columnCount
 * @param {number} gapPx
 * @param {number} aspectRatio Width / height (e.g. 1 = square, 0.75 = 3:4 portrait).
 * @return {number|null}
 */
export function uniformGridCellMinHeightPx(
	containerWidth,
	columnCount,
	gapPx,
	aspectRatio
) {
	const width = Math.floor(Number(containerWidth) || 0);
	const cols = Math.floor(Number(columnCount) || 0);
	const gap = Math.max(0, Number(gapPx) || 0);
	const ratio = Number(aspectRatio);
	if (width <= 0 || cols <= 0 || !Number.isFinite(ratio) || ratio <= 0) {
		return null;
	}
	const totalGap = Math.max(0, cols - 1) * gap;
	const columnWidth = (width - totalGap) / cols;
	if (columnWidth <= 0) {
		return null;
	}
	return Math.max(1, Math.round(columnWidth / ratio));
}
