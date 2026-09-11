/**
 * UTM helpers for Modula v3 (gallery editor / listing) upgrade links.
 */

export const V3_UTM_CONTENT = 'v3';

/**
 * @param {string} url
 * @param {string} query e.g. a=1&b=2 (no leading ?)
 * @return {string}
 */
export function appendQuery(url, query) {
	if (!url || !query) {
		return url || '';
	}
	const sep = url.includes('?') ? '&' : '?';
	return `${url}${sep}${query}`;
}

/**
 * Ensure outbound pricing / compare URLs mark traffic as from Modula v3.
 *
 * @param {string} url
 * @return {string}
 */
export function withV3Utm(url) {
	if (typeof url !== 'string' || url === '') {
		return url;
	}
	if (/(?:^|[?&])utm_content=v3(?:&|$)/.test(url)) {
		return url;
	}
	return appendQuery(url, `utm_content=${V3_UTM_CONTENT}`);
}
