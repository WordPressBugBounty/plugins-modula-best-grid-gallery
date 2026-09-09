/**
 * WordPress / PHP / REST often use 1 or '1' for boolean true.
 *
 * @param {*} v
 * @return {boolean} True when value is boolean/number/string PHP-truthy flag.
 */
export function isWpTruthy(v) {
	return v === true || v === 1 || v === '1';
}
