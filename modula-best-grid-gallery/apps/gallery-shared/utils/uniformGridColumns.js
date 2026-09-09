/**
 * Uniform grid column count rules (minimum 2 columns).
 *
 * @package
 */

/**
 * @param {unknown} gridType   layout.gridType
 * @param {number}  [fallback]
 * @return {number}
 */
export function clampUniformGridColumnCount(gridType, fallback = 4) {
	const parsed = parseInt(gridType, 10);
	if (Number.isFinite(parsed)) {
		if (parsed === 1) {
			return 2;
		}
		if (parsed >= 2 && parsed <= 12) {
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
		return '2';
	}
	if (parsed < 2) {
		return '2';
	}
	if (parsed > 12) {
		return '12';
	}
	return String(parsed);
}
