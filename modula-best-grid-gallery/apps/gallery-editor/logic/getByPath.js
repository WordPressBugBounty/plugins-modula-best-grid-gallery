/**
 * Read grouped settings by dotted path e.g. "general.type".
 *
 * @param {Record<string, Record<string, unknown>>} grouped State.
 * @param {string}                                  path    Dotted path.
 * @return {unknown} Value at path, or undefined if missing / invalid.
 */
export function getByPath(grouped, path) {
	if (!path || !grouped || typeof grouped !== 'object') {
		return undefined;
	}
	const parts = path.split('.').filter(Boolean);
	let cur = grouped;
	for (const p of parts) {
		if (
			cur === null ||
			cur === undefined ||
			typeof cur !== 'object' ||
			!Object.prototype.hasOwnProperty.call(cur, p)
		) {
			return undefined;
		}
		cur = cur[p];
	}
	return cur;
}
