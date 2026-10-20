import { useEffect, useMemo, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { useQuery } from '@tanstack/react-query';
import apiFetch from '@wordpress/api-fetch';
import { addQueryArgs } from '@wordpress/url';
import { postSuggestions } from './postPicker';

// Searching starts at two characters, after the user pauses typing.
const MIN_QUERY_LENGTH = 2;
const SEARCH_DELAY_MS = 250;
const RESULTS_PER_SEARCH = 20;

/**
 * Posts and pages from the core search route.
 *
 * @param {Object} args Extra search arguments (`search`, `include`).
 * @return {Promise<Object[]>} Search rows (`{ id, title }`).
 */
function searchPosts(args) {
	return apiFetch({
		path: addQueryArgs('/wp/v2/search', {
			type: 'post',
			subtype: 'post,page',
			...args,
		}),
	});
}

/**
 * @param {string} value
 * @return {string} The value once it has stopped changing for a moment.
 */
function useSettledValue(value) {
	const [settled, setSettled] = useState(value);

	useEffect(() => {
		const timer = setTimeout(() => setSettled(value), SEARCH_DELAY_MS);

		return () => clearTimeout(timer);
	}, [value]);

	return settled;
}

/**
 * Labels for the chosen posts. Pro sends the stored posts' titles; a post
 * chosen before the card remounted is looked up once. Until then, or when
 * the lookup fails, a post shows as `#id`.
 *
 * @param {number[]} ids   Chosen post IDs.
 * @param {Object[]} items Pro's `{ id, label }` for the stored posts.
 * @return {{ labels: Object, remember: Function }} Label by ID, and a setter (option).
 */
function usePostLabels(ids, items) {
	const [learned, setLearned] = useState({});
	const known = useMemo(
		() => ({
			...Object.fromEntries(
				(items || []).map((item) => [Number(item.id), item.label])
			),
			...learned,
		}),
		[items, learned]
	);
	const missing = ids.filter((id) => !Object.hasOwn(known, id));
	const lookup = useQuery({
		queryKey: ['settings-post-labels', missing],
		enabled: missing.length > 0,
		retry: 1,
		queryFn: () =>
			searchPosts({ include: missing, per_page: missing.length }),
	});
	// The route may ignore `include` (older WordPress): keep only asked IDs.
	const found = postSuggestions(lookup.data || [], []).filter((option) =>
		missing.includes(option.value)
	);
	const labels = {
		...known,
		...Object.fromEntries(
			found.map((option) => [option.value, option.label])
		),
	};
	const remember = (option) =>
		setLearned((current) => ({ ...current, [option.value]: option.label }));

	return { labels, remember };
}

/**
 * Search status line for the picker.
 *
 * @param {Object}  search       The search query state.
 * @param {boolean} isSearchable Whether the typed text is long enough to search.
 * @param {boolean} isSettled    Whether the search ran for the typed text yet.
 * @param {number}  count        Suggestions shown.
 * @return {string} Status, empty when there is nothing to say.
 */
function searchStatus(search, isSearchable, isSettled, count) {
	if (!isSearchable) {
		return '';
	}
	if (search.isError && isSettled) {
		return __(
			'The search did not work. Try again.',
			'modula-best-grid-gallery'
		);
	}
	if (!isSettled || !search.isSuccess) {
		return __('Searching…', 'modula-best-grid-gallery');
	}

	return 0 === count
		? __('No posts or pages match.', 'modula-best-grid-gallery')
		: '';
}

/**
 * State of a post picker: its chips, the search text and its results.
 *
 * @param {Object}   args
 * @param {number[]} args.ids   Chosen post IDs.
 * @param {Object[]} args.items Pro's `{ id, label }` for the stored posts.
 * @return {Object} `tokens`, `query`, `setQuery`, `suggestions`, `status`, `remember(option)`.
 */
export function usePostPicker({ ids, items }) {
	const [query, setQuery] = useState('');
	const typedQuery = query.trim();
	const settledQuery = useSettledValue(typedQuery);
	const { labels, remember } = usePostLabels(ids, items);
	const canSearch = settledQuery.length >= MIN_QUERY_LENGTH;
	const search = useQuery({
		queryKey: ['settings-post-search', settledQuery],
		enabled: canSearch,
		retry: 1,
		queryFn: () =>
			searchPosts({ search: settledQuery, per_page: RESULTS_PER_SEARCH }),
	});
	const isSearchable = typedQuery.length >= MIN_QUERY_LENGTH;
	// Results hide as soon as the text is too short, without waiting for it
	// to settle.
	const suggestions =
		canSearch && isSearchable
			? postSuggestions(search.data || [], ids)
			: [];

	return {
		tokens: ids.map((id) => ({ value: id, label: labels[id] ?? `#${id}` })),
		query,
		setQuery,
		suggestions,
		status: searchStatus(
			search,
			isSearchable,
			typedQuery === settledQuery,
			suggestions.length
		),
		remember,
	};
}
