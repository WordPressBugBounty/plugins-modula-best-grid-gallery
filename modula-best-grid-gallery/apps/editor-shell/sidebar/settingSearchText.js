/**
 * Text matching shared by Setting search and the gallery's command palette:
 * every query word must appear in an entry's lowercase text blob.
 */

/**
 * @param {Array<string|null|undefined>} parts
 * @return {string} Single lowercase string used for text matching.
 */
export function normalizeBlob(parts) {
	return parts
		.filter((p) => p !== undefined && p !== null && String(p).trim() !== '')
		.map((p) => String(p).trim())
		.join('\n')
		.toLowerCase();
}

/**
 * @param {Object} field Form field descriptor.
 * @return {string} Text blob from editor/schema descriptions.
 */
export function fieldDescriptionBlob(field) {
	const bits = [];
	if (typeof field.editorDescription === 'string') {
		bits.push(field.editorDescription);
	}
	const schema = field.schema;
	if (
		schema &&
		typeof schema === 'object' &&
		typeof schema.description === 'string'
	) {
		bits.push(schema.description);
	}
	return bits.join(' ');
}

/**
 * @param {string} q
 * @return {string[]} The query's lowercase words.
 */
export function tokenizeQuery(q) {
	return q.toLowerCase().trim().split(/\s+/).filter(Boolean);
}

/**
 * Every query word appears somewhere in the blob, in any order.
 *
 * @param {string}   searchBlob Lowercase text (`normalizeBlob`).
 * @param {string[]} tokens     From {@link tokenizeQuery}.
 * @return {boolean} Whether the blob matches.
 */
export function matchesQueryTokens(searchBlob, tokens) {
	return tokens.every((t) => searchBlob.includes(t));
}
