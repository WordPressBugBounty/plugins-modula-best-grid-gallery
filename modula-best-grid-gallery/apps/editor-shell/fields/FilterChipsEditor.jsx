/**
 * An item's filters as chips, then "+ Add" (canvas: the gallery's image
 * panel and Bulk edit, the Albums editor's member panel). "+ Add" opens a
 * search over the editor's filters that can also name a new one. The caller
 * saves the value; new names reach the editor's filter list through that
 * save.
 *
 * Styles: `styles/_filter-chips-editor.scss`.
 */
import '../styles/_filter-chips-editor.scss';
import { useCallback, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { Chip, TokenPicker } from 'admin-ui';
import { formatFilterTags, parseFilterTags } from './filterTags';
import {
	filterNameFromSuggestion,
	filterTokenSuggestions,
} from './filterTokenSuggestions';

/**
 * @param {string} name
 * @return {string} Label of the result that adds a new filter.
 */
function addFilterLabel(name) {
	return sprintf(
		/* translators: %s: filter name the user typed. */
		__('Add “%s”', 'modula-best-grid-gallery'),
		name
	);
}

/**
 * @param {string} name
 * @return {string} Name of a chip's remove button.
 */
function removeFilterLabel(name) {
	return sprintf(
		/* translators: %s: filter name. */
		__('Remove filter %s', 'modula-best-grid-gallery'),
		name
	);
}

/**
 * Before typing, the search lists the editor's filters the item lacks.
 *
 * @param {string}   query
 * @param {string[]} names  The editor's filter names.
 * @param {string[]} tokens The item's filters.
 * @return {Array<{ value: string, label: string }>} Search results.
 */
function filterSearchResults(query, names, tokens) {
	if (String(query).trim() !== '') {
		return filterTokenSuggestions({
			query,
			names,
			tokens,
			addLabel: addFilterLabel,
		});
	}
	const chosen = new Set(tokens.map((token) => token.toLowerCase()));
	return names
		.filter((name) => !chosen.has(name.toLowerCase()))
		.map((name) => ({ value: name, label: name }));
}

/**
 * The caller owns `isAdding`, so a field label can point at the search
 * while it shows.
 *
 * @param {Object}                    props
 * @param {string}                    props.value          Comma-separated filter names.
 * @param {(v: string) => void}       props.onChange       Receives comma-separated names.
 * @param {string[]}                  props.filterNames    The editor's filter names (`filterListNames`).
 * @param {string}                    props.searchId       Id of the search input.
 * @param {boolean}                   props.isAdding       The search shows instead of "+ Add".
 * @param {(adding: boolean) => void} props.onAddingChange
 */
export default function FilterChipsEditor({
	value,
	onChange,
	filterNames,
	searchId,
	isAdding,
	onAddingChange,
}) {
	const [query, setQuery] = useState('');
	const tokens = parseFilterTags(value);

	// Focus the search once "+ Add" reveals it.
	const focusSearch = useCallback((node) => {
		node?.querySelector('input')?.focus();
	}, []);

	return (
		<>
			<div className="modula-filter-chips">
				{tokens.map((token) => (
					<Chip
						key={token}
						removeLabel={removeFilterLabel(token)}
						onRemove={() =>
							onChange(
								formatFilterTags(
									tokens.filter((t) => t !== token)
								)
							)
						}
					>
						{token}
					</Chip>
				))}
				{isAdding ? null : (
					<button
						type="button"
						className="modula-filter-chips__add"
						onClick={() => onAddingChange(true)}
					>
						{__('+ Add', 'modula-best-grid-gallery')}
					</button>
				)}
			</div>
			{isAdding ? (
				// Focus leaving the search puts "+ Add" back.
				<div
					ref={focusSearch}
					onBlur={(event) => {
						if (
							!event.currentTarget.contains(event.relatedTarget)
						) {
							onAddingChange(false);
							setQuery('');
						}
					}}
				>
					<TokenPicker
						id={searchId}
						tokens={[]}
						query={query}
						onQueryChange={setQuery}
						suggestions={filterSearchResults(
							query,
							filterNames,
							tokens
						)}
						onPick={(option) =>
							onChange(
								formatFilterTags([
									...tokens,
									filterNameFromSuggestion(option.value),
								])
							)
						}
						removeLabel={removeFilterLabel}
						placeholder={__(
							'Filter name',
							'modula-best-grid-gallery'
						)}
					/>
				</div>
			) : null}
		</>
	);
}
