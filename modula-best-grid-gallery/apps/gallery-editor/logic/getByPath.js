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

/**
 * Write a value at a dotted grouped path, creating intermediate objects.
 *
 * @param {Record<string, Record<string, unknown>>} grouped State (mutated).
 * @param {string}                                  path    Dotted path.
 * @param {unknown}                                 value   Value to store.
 */
export function setByPath(grouped, path, value) {
	if (!path || !grouped || typeof grouped !== 'object') {
		return;
	}
	const parts = path.split('.').filter(Boolean);
	if (parts.length === 0) {
		return;
	}
	let cur = grouped;
	for (let i = 0; i < parts.length - 1; i++) {
		const part = parts[i];
		if (
			cur[part] === undefined ||
			cur[part] === null ||
			typeof cur[part] !== 'object'
		) {
			cur[part] = {};
		}
		cur = cur[part];
	}
	cur[parts[parts.length - 1]] = value;
}
