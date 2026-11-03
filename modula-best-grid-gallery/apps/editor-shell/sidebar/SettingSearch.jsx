/**
 * Setting search ("Find a setting…") at the top of the settings panel. While
 * it holds a query, its results replace the category's settings; the arrow
 * keys move through them, Enter chooses one and Esc clears the query.
 *
 * Each editor passes the settings its panel shows for the current form state
 * (`listShownSettings` from its `createSettingSearch` binding).
 */
import { __, _n, sprintf } from '@wordpress/i18n';
import { useId, useMemo, useState } from '@wordpress/element';
import { PlanBadge, SearchField } from 'admin-ui';
import { matchSettings } from './settingSearchIndex';

/**
 * @typedef {import('./settingSearchIndex').SettingSearchResult} SettingSearchResult
 * @typedef {import('./settingSearchIndex').ShownSetting} ShownSetting
 */

/**
 * @param {Object}                                props
 * @param {string}                                props.query
 * @param {(next: string) => void}                props.onQueryChange
 * @param {(result: SettingSearchResult) => void} props.onChoose
 * @param {() => ShownSetting[]}                  props.listShown     The settings the panel shows now; called only while searching. A new function when the form state changes.
 * @param {import('react').ReactNode}             props.children      The category's settings, shown without a query.
 */
export default function SettingSearch({
	query,
	onQueryChange,
	onChoose,
	listShown,
	children,
}) {
	const [activeIndex, setActiveIndex] = useState(0);
	const id = `modula-setting-search-${useId()}`;
	const listId = `${id}-results`;
	const optionId = (index) => `${id}-result-${index}`;

	const isSearching = query.trim() !== '';
	const shown = useMemo(
		() => (isSearching ? listShown() : []),
		[isSearching, listShown]
	);
	const results = useMemo(() => matchSettings(shown, query), [shown, query]);
	// Results can shrink while the index stays: keep it on a real result.
	const active = Math.min(activeIndex, results.length - 1);

	const changeQuery = (next) => {
		setActiveIndex(0);
		onQueryChange(next);
	};

	const moveActive = (step) => {
		if (results.length === 0) {
			return;
		}
		const next = (active + step + results.length) % results.length;
		setActiveIndex(next);
		document
			.getElementById(optionId(next))
			?.scrollIntoView({ block: 'nearest' });
	};

	const onKeyDown = (event) => {
		switch (event.key) {
			case 'ArrowDown':
				event.preventDefault();
				moveActive(1);
				break;
			case 'ArrowUp':
				event.preventDefault();
				moveActive(-1);
				break;
			case 'Enter':
				event.preventDefault();
				if (results.length > 0) {
					onChoose(results[active]);
				}
				break;
			case 'Escape':
				if (query !== '') {
					// Clear the search only; the editor's own Esc handlers
					// (image edit, dialogs) stay out of it.
					event.preventDefault();
					event.stopPropagation();
					changeQuery('');
				}
				break;
		}
	};

	return (
		<>
			<div className="modula-setting-search">
				<SearchField
					value={query}
					onChange={changeQuery}
					label={__('Find a setting', 'modula-best-grid-gallery')}
					placeholder={__(
						'Find a setting…',
						'modula-best-grid-gallery'
					)}
					resultCount={isSearching ? results.length : null}
					role="combobox"
					aria-autocomplete="list"
					aria-expanded={results.length > 0}
					aria-controls={listId}
					aria-activedescendant={
						results.length > 0 ? optionId(active) : undefined
					}
					autoComplete="off"
					onKeyDown={onKeyDown}
				/>
			</div>
			{isSearching ? (
				<div className="modula-settings-panel__scroll">
					<SettingSearchResults
						query={query}
						results={results}
						active={active}
						listId={listId}
						optionId={optionId}
						onChoose={onChoose}
					/>
				</div>
			) : (
				children
			)}
		</>
	);
}

/**
 * @param {Object}                                props
 * @param {string}                                props.query
 * @param {SettingSearchResult[]}                 props.results
 * @param {number}                                props.active   Index of the result Enter chooses.
 * @param {string}                                props.listId
 * @param {(index: number) => string}             props.optionId
 * @param {(result: SettingSearchResult) => void} props.onChoose
 */
function SettingSearchResults({
	query,
	results,
	active,
	listId,
	optionId,
	onChoose,
}) {
	if (results.length === 0) {
		return (
			<div className="modula-setting-search__box">
				<p className="modula-setting-search__empty">
					{sprintf(
						/* translators: %s: what the user searched for. */
						__('Nothing matches “%s”.', 'modula-best-grid-gallery'),
						query.trim()
					)}
				</p>
			</div>
		);
	}

	return (
		<>
			<h2 className="modula-setting-search__count">
				{sprintf(
					/* translators: %d: number of matching settings. */
					_n(
						'%d setting',
						'%d settings',
						results.length,
						'modula-best-grid-gallery'
					),
					results.length
				)}
			</h2>
			<ul
				id={listId}
				role="listbox"
				aria-label={__('Matching settings', 'modula-best-grid-gallery')}
				className="modula-setting-search__box"
			>
				{results.map((result, index) => (
					// Keyboard use goes through the combobox above.
					// eslint-disable-next-line jsx-a11y/click-events-have-key-events
					<li
						key={result.id}
						id={optionId(index)}
						role="option"
						aria-selected={index === active}
						className={
							index === active
								? 'modula-setting-search__result is-active'
								: 'modula-setting-search__result'
						}
						// Keep focus in the field until the choice lands.
						onMouseDown={(event) => event.preventDefault()}
						onClick={() => onChoose(result)}
					>
						<span className="modula-setting-search__label">
							{result.label}
							{result.locked ? (
								<PlanBadge tone="outline" lock plan="PRO" />
							) : null}
						</span>
						<span className="modula-setting-search__where">
							{result.where}
						</span>
					</li>
				))}
			</ul>
		</>
	);
}
