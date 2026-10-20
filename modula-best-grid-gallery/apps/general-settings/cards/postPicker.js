import { decodeEntities } from '@wordpress/html-entities';

/**
 * A post's title for the picker: decoded, or `#id` when it has none.
 *
 * @param {number} id
 * @param {string} title Title as the REST API renders it.
 * @return {string} Label.
 */
function postLabel(id, title) {
	const decoded = 'string' === typeof title ? decodeEntities(title) : '';

	return '' === decoded ? `#${id}` : decoded;
}

/**
 * The chosen post IDs in a stored value: positive and unique, in order.
 *
 * @param {*} stored Stored list (Pro's `exceptions`).
 * @return {number[]} Post IDs.
 */
export function chosenPostIds(stored) {
	if (!Array.isArray(stored)) {
		return [];
	}
	const ids = stored
		.map(Number)
		.filter((id) => Number.isInteger(id) && id > 0);

	return [...new Set(ids)];
}

/**
 * Picker suggestions from a /wp/v2/search response, without the posts
 * already chosen.
 *
 * @param {Object[]} results  Search rows (`{ id, title }`).
 * @param {number[]} selected Chosen post IDs.
 * @return {{ value: number, label: string }[]} Suggestions, in search order.
 */
export function postSuggestions(results, selected) {
	return results
		.filter((row) => !selected.includes(row.id))
		.map((row) => ({ value: row.id, label: postLabel(row.id, row.title) }));
}
