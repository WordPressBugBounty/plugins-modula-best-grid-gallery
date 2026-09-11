/**
 * Takeover sidebar rail density from hypothetical canvas leftover.
 *
 * Leftover is computed as if the rail were comfortable, so compacting
 * the rail does not change the measurement (no oscillation).
 */

/** Layout fallbacks plus the compact leftover floor (`minLeftover`). */
export const RAIL_DENSITY_FALLBACKS = {
	railWidth: 232,
	panelWidth: 404,
	stagePaddingX: 24,
	/** Compact when hypothetical canvas leftover is below this (px). */
	minLeftover: 1020,
};

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
 * @param {Object} props
 * @param {number} props.mountWidth    Workspace width in px.
 * @param {number} props.railWidth     Comfortable sidebar rail width in px.
 * @param {number} props.panelWidth    Settings panel width in px.
 * @param {number} [props.auxWidth=0]  Auxiliary column width in px.
 * @param {number} props.stagePaddingX Horizontal stage padding (both sides) in px.
 * @param {number} props.minLeftover   Canvas leftover floor in px.
 * @return {'comfortable'|'compact'} Rail density.
 */
export function resolveRailDensity({
	mountWidth,
	railWidth,
	panelWidth,
	auxWidth = 0,
	stagePaddingX,
	minLeftover,
}) {
	if (
		typeof mountWidth !== 'number' ||
		!Number.isFinite(mountWidth) ||
		mountWidth <= 0
	) {
		return 'comfortable';
	}

	const leftover =
		mountWidth - railWidth - panelWidth - auxWidth - stagePaddingX;

	return leftover < minLeftover ? 'compact' : 'comfortable';
}
