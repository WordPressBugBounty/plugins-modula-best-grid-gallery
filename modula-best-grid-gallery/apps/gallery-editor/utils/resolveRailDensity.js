/**
 * Takeover sidebar layout measurement helpers.
 *
 * The sidebar rail is a fixed 72 CSS px icon-only column. Comfortable/compact
 * density switching is retired; these fallbacks stay aligned with theme tokens
 * (`--mod-se-rail-w` / `--mod-se-panel-w`) for any leftover math callers.
 */

/** Layout measurement fallbacks matching takeover theme tokens. */
export const RAIL_LAYOUT_FALLBACKS = {
	railWidth: 72,
	panelWidth: 300,
	stagePaddingX: 24,
	/**
	 * Unused when density switching is retired. Kept so transitional callers
	 * that still read `RAIL_DENSITY_FALLBACKS.minLeftover` do not throw.
	 */
	minLeftover: 1020,
};

/** @deprecated Use RAIL_LAYOUT_FALLBACKS. Kept for any transitional imports. */
export const RAIL_DENSITY_FALLBACKS = RAIL_LAYOUT_FALLBACKS;

/**
 * @param {string} value CSS length from getComputedStyle / a custom property.
 * @return {number|null} Pixel length, or null when the value is not `px`.
 */
export function parseCssPx(value) {
	if (typeof value !== 'string') {
		return null;
	}
	const s = value.trim();
	if (!s) {
		return null;
	}
	const match = /^(-?\d+(?:\.\d+)?)px$/i.exec(s);
	if (!match) {
		return null;
	}
	const px = Number(match[1]);
	if (!Number.isFinite(px)) {
		return null;
	}
	return px;
}

/**
 * @deprecated Automatic comfortable/compact rail switching is retired.
 * Transitional callers may still import this; always returns `comfortable`
 * so leftover-based oscillation cannot return.
 *
 * @return {'comfortable'}
 */
export function resolveRailDensity() {
	return 'comfortable';
}
