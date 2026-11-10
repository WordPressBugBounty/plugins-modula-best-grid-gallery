/**
 * Uniform grid column count rules (minimum 2 columns).
 *
 * @package
 */

/** Uniform grid and Fit grid never draw fewer columns than this. */
export const UNIFORM_GRID_MIN_COLUMNS = 2;

/**
 * @param {unknown} gridType   layout.gridType
 * @param {number}  [fallback]
 * @return {number}
 */
export function clampUniformGridColumnCount(gridType, fallback = 4) {
	const parsed = parseInt(gridType, 10);
	if (Number.isFinite(parsed)) {
		if (parsed === 1) {
			return UNIFORM_GRID_MIN_COLUMNS;
		}
		if (parsed >= UNIFORM_GRID_MIN_COLUMNS && parsed <= 12) {
			return parsed;
		}
	}
	return fallback;
}

/**
 * @param {unknown} gridType Stored layout.gridType
 * @return {string}
 */
export function normalizeUniformGridColumnSetting(gridType) {
	const parsed = parseInt(gridType, 10);
	if (!Number.isFinite(parsed)) {
		return String(UNIFORM_GRID_MIN_COLUMNS);
	}
	if (parsed < UNIFORM_GRID_MIN_COLUMNS) {
		return String(UNIFORM_GRID_MIN_COLUMNS);
	}
	if (parsed > 12) {
		return '12';
	}
	return String(parsed);
}
