import { useMemo, useRef, useState } from '@wordpress/element';
import { buildSearchIndex, searchSettings } from '../model/settingsPageModel';

/**
 * The nav search: what was typed, its results, and choosing one.
 *
 * Choosing a result opens its section and clears the search. The chosen
 * result's button disappears with the results, so focus returns to the
 * search field instead of falling back to the page.
 *
 * @param {Object[]} groups      Projected settings groups.
 * @param {Function} openSection Opens a section by id.
 * @return {{ query: string, setQuery: Function, results: Object[]|null, choose: Function, inputRef: Object }}
 * Search state; `results` is null while the query is blank.
 */
export function useSettingsSearch(groups, openSection) {
	const [query, setQuery] = useState('');
	const inputRef = useRef(null);
	const index = useMemo(() => buildSearchIndex(groups), [groups]);
	const results = searchSettings(index, query);

	const choose = (result) => {
		openSection(result.sectionId);
		setQuery('');
		inputRef.current?.focus();
	};

	return { query, setQuery, results, choose, inputRef };
}
