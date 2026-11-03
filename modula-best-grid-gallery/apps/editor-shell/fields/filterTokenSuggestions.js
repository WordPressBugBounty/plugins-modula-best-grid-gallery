/**
 * Search results for an item's filters field (a gallery image, an album
 * member): the editor's filters that contain the query, then "Add “query”"
 * when the query names a new filter.
 * Enter adds the highlighted result, the first match, as the old token field
 * did; with no match, the only result adds the typed filter.
 */

/** Marks the "Add “…”" result, whose value is the typed name. */
export const NEW_FILTER_TOKEN_PREFIX = '__new:';

/**
 * @param {string} value A result's value.
 * @return {string} The filter name picking that result adds.
 */
export function filterNameFromSuggestion(value) {
	const text = String(value);

	return text.startsWith(NEW_FILTER_TOKEN_PREFIX)
		? text.slice(NEW_FILTER_TOKEN_PREFIX.length)
		: text;
}

/**
 * @param {Object}                   args
 * @param {string}                   args.query    Search text.
 * @param {string[]}                 args.names    The gallery's filter names.
 * @param {string[]}                 args.tokens   Filters already chosen.
 * @param {(name: string) => string} args.addLabel Label of the "add" result.
 * @return {Array<{ value: string, label: string }>} Results in order.
 */
export function filterTokenSuggestions({ query, names, tokens, addLabel }) {
	const typed = String(query || '').trim();
	if (typed === '') {
		return [];
	}
	const needle = typed.toLowerCase();
	const chosen = new Set(tokens.map((token) => token.toLowerCase()));
	const matches = names
		.map((name) => String(name).trim())
		.filter(
			(name) =>
				name !== '' &&
				!chosen.has(name.toLowerCase()) &&
				name.toLowerCase().includes(needle)
		);
	const isKnown =
		chosen.has(needle) ||
		names.some((name) => String(name).trim().toLowerCase() === needle);
	const results = matches.map((name) => ({ value: name, label: name }));
	if (!isKnown) {
		results.push({
			value: `${NEW_FILTER_TOKEN_PREFIX}${typed}`,
			label: addLabel(typed),
		});
	}

	return results;
}
