/**
 * Turn camelCase API key into a short label (e.g. randomFactor → Random factor).
 *
 * @param {string} key
 * @return {string} Title-style label derived from the key.
 */
export function humanizeKey(key) {
	if (!key || typeof key !== 'string') {
		return '';
	}
	const spaced = key.replace(/([A-Z])/g, ' $1').trim();
	return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
