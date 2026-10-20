import { __, _n, sprintf } from '@wordpress/i18n';
import { SearchIcon } from '../icons/icons';

/**
 * The page's section navigation column. `search` sits above the items; while
 * a search is active, pass SearchResults as the children instead of items.
 *
 * @param {Object}                    props
 * @param {string}                    props.label    Accessible name, e.g. "Settings sections".
 * @param {import('react').ReactNode} [props.search] A SearchField.
 * @param {import('react').ReactNode} props.children NavHeading and NavItem, or SearchResults.
 */
export function Nav({ label, search = null, children }) {
	return (
		<nav className="modula-admin-nav" aria-label={label}>
			{search ? (
				<div className="modula-admin-nav__search">{search}</div>
			) : null}
			{children}
		</nav>
	);
}

/**
 * Heading of a group of nav items (a settings group, e.g. "General").
 *
 * @param {Object}                    props
 * @param {import('react').ReactNode} props.children
 */
export function NavHeading({ children }) {
	return <h2 className="modula-admin-nav__heading">{children}</h2>;
}

/**
 * One nav entry. The current one is marked with `aria-current="page"`.
 *
 * @param {Object}                    props
 * @param {boolean}                   [props.current]
 * @param {Function}                  props.onClick
 * @param {string}                    [props.className]
 * @param {import('react').ReactNode} props.children
 */
export function NavItem({
	current = false,
	onClick,
	className = '',
	children,
}) {
	const classes = [
		'modula-admin-nav__item',
		current ? 'is-current' : '',
		className,
	]
		.filter(Boolean)
		.join(' ');

	return (
		<button
			type="button"
			className={classes}
			aria-current={current ? 'page' : undefined}
			onClick={onClick}
		>
			{children}
		</button>
	);
}

function noMatchMessage() {
	return __('No setting matches', 'modula-best-grid-gallery');
}

/**
 * What the search announces for a result count.
 *
 * @param {number|null} resultCount Null while there is no search.
 * @return {string} Announcement, empty for none.
 */
function resultCountMessage(resultCount) {
	if (null === resultCount) {
		return '';
	}
	if (0 === resultCount) {
		return noMatchMessage();
	}

	return sprintf(
		/* translators: %d: number of matching settings. */
		_n(
			'%d setting found',
			'%d settings found',
			resultCount,
			'modula-best-grid-gallery'
		),
		resultCount
	);
}

/**
 * Search box for the nav ("Find a setting…"). It owns the live region that
 * announces the result count: the field stays mounted while results come
 * and go, and a live region only announces changes, not its first content.
 *
 * @param {Object}      props
 * @param {string}      props.value
 * @param {Function}    props.onChange      Receives the next string.
 * @param {string}      props.label         Accessible name.
 * @param {number|null} props.resultCount   Matches shown, or null while there is no search.
 * @param {string}      [props.placeholder]
 * @param {Object}      [props.inputRef]    Ref to the input, to return focus to it after a result is chosen.
 */
export function SearchField({
	value,
	onChange,
	label,
	resultCount,
	placeholder = '',
	inputRef = null,
}) {
	return (
		<div className="modula-admin-search">
			<span className="modula-admin-search__icon" aria-hidden="true">
				<SearchIcon />
			</span>
			<input
				ref={inputRef}
				type="search"
				className="modula-admin-search__input"
				aria-label={label}
				placeholder={placeholder}
				value={value}
				onChange={(event) => onChange(event.target.value)}
			/>
			<span className="modula-admin-sr-only" role="status">
				{resultCountMessage(resultCount)}
			</span>
		</div>
	);
}

/**
 * @typedef {{ id: string, label: string, path: string }} SearchResult
 */

/**
 * Matches for the nav search: each result shows its name and its path
 * ("General / AI"), or "No setting matches". SearchField announces them.
 *
 * @param {Object}         props
 * @param {SearchResult[]} props.results
 * @param {Function}       props.onSelect Receives the chosen result.
 */
export function SearchResults({ results, onSelect }) {
	if (0 === results.length) {
		return (
			<p className="modula-admin-search-results__empty">
				{noMatchMessage()}
			</p>
		);
	}

	return (
		<ul
			className="modula-admin-search-results"
			aria-label={__('Matching settings', 'modula-best-grid-gallery')}
		>
			{results.map((result) => (
				<li key={result.id}>
					<button
						type="button"
						className="modula-admin-search-results__item"
						onClick={() => onSelect(result)}
					>
						<span className="modula-admin-search-results__label">
							{result.label}
						</span>
						<span className="modula-admin-search-results__path">
							{result.path}
						</span>
					</button>
				</li>
			))}
		</ul>
	);
}
