/**
 * Normalize WP / bootstrap caption payloads to a plain string (avoids [object Object] in inputs).
 *
 * @param {*} value Caption or description from REST/bootstrap.
 * @return {string} Plain string safe for controlled inputs.
 */
export function captionToPlainString(value) {
	if (value === null || value === undefined) {
		return '';
	}
	if (typeof value === 'string') {
		return value;
	}
	if (typeof value === 'number' || typeof value === 'boolean') {
		return String(value);
	}
	if (typeof value === 'object') {
		if (typeof value.raw === 'string') {
			return value.raw;
		}
		if (typeof value.rendered === 'string') {
			return value.rendered;
		}
		if (typeof value.text === 'string') {
			return value.text;
		}
	}
	return '';
}
