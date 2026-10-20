import { useState } from '@wordpress/element';
import { joinIds } from '../field/Field';
import { CloseIcon } from '../icons/icons';

/**
 * @typedef {{ value: string|number, label: string }} TokenOption
 */

/**
 * The chosen items as removable chips, and a search field whose results
 * (a listbox) add an item. Searching is the caller's job: it receives the
 * query and passes back `suggestions` and a `status` line ("Searching…",
 * "Nothing found").
 *
 * The search field is an ARIA 1.2 combobox: arrow keys move through the
 * results, Enter adds the active one, Escape closes them. Name it with
 * `<label htmlFor={id}>` (SettingsRow does this) or `aria-label`.
 *
 * @param {Object}        props
 * @param {string}        props.id                   Search field id.
 * @param {TokenOption[]} props.tokens               Chosen items, in order.
 * @param {Function}      props.onRemove             Receives the removed item's value.
 * @param {string}        props.query
 * @param {Function}      props.onQueryChange        Receives the search text.
 * @param {TokenOption[]} props.suggestions          Results for the query, without chosen items.
 * @param {Function}      props.onPick               Receives the added option; the query then clears.
 * @param {Function}      props.removeLabel          Name of a chip's remove button, from its label.
 * @param {string}        [props.status]             Search state shown under the field.
 * @param {string}        [props.placeholder]
 * @param {boolean}       [props.disabled]
 * @param {string}        [props.className]
 * @param {string}        [props.'aria-label']       Search field name, without a visible label.
 * @param {string}        [props.'aria-describedby'] Help ids, given to the search field.
 */
export function TokenPicker({
	id,
	tokens = [],
	onRemove,
	query = '',
	onQueryChange,
	suggestions = [],
	onPick,
	removeLabel,
	status = '',
	placeholder = '',
	disabled = false,
	className = '',
	'aria-label': ariaLabel,
	'aria-describedby': describedBy,
}) {
	const [isOpen, setIsOpen] = useState(false);
	const [activeIndex, setActiveIndex] = useState(0);
	const listId = `${id}-results`;
	const statusId = `${id}-status`;
	const isExpanded = isOpen && suggestions.length > 0;
	// Results can shrink while the index stays: keep it on a real option.
	const active = Math.min(activeIndex, suggestions.length - 1);
	const optionId = (index) => `${id}-result-${index}`;

	const changeQuery = (next) => {
		setIsOpen(true);
		setActiveIndex(0);
		onQueryChange?.(next);
	};

	const pick = (option) => {
		onPick?.(option);
		changeQuery('');
	};

	const moveActive = (step) => {
		setIsOpen(true);
		if (0 === suggestions.length) {
			return;
		}
		setActiveIndex(
			(active + step + suggestions.length) % suggestions.length
		);
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
				// Without results, Enter does nothing (no form to submit).
				event.preventDefault();
				if (isExpanded) {
					pick(suggestions[active]);
				}
				break;
			case 'Escape':
				if (isExpanded) {
					event.preventDefault();
					setIsOpen(false);
				}
				break;
		}
	};

	return (
		<div
			className={['modula-admin-token-picker', className]
				.filter(Boolean)
				.join(' ')}
		>
			{tokens.length > 0 ? (
				<ul className="modula-admin-token-picker__tokens">
					{tokens.map((token) => (
						<li
							key={token.value}
							className="modula-admin-token-picker__token"
						>
							<span>{token.label}</span>
							<button
								type="button"
								className="modula-admin-token-picker__remove"
								aria-label={removeLabel(token.label)}
								disabled={disabled}
								onClick={() => onRemove?.(token.value)}
							>
								<CloseIcon />
							</button>
						</li>
					))}
				</ul>
			) : null}
			<div className="modula-admin-token-picker__search">
				<input
					id={id}
					type="text"
					className="modula-admin-text-input"
					role="combobox"
					aria-label={ariaLabel}
					aria-autocomplete="list"
					aria-expanded={isExpanded}
					aria-controls={listId}
					aria-activedescendant={
						isExpanded ? optionId(active) : undefined
					}
					aria-describedby={joinIds(
						describedBy,
						status ? statusId : ''
					)}
					autoComplete="off"
					value={query}
					placeholder={placeholder}
					disabled={disabled}
					onChange={(event) => changeQuery(event.target.value)}
					onKeyDown={onKeyDown}
					onFocus={() => setIsOpen(true)}
					onBlur={() => setIsOpen(false)}
				/>
				<ul
					id={listId}
					role="listbox"
					className="modula-admin-token-picker__results"
					hidden={!isExpanded}
				>
					{suggestions.map((option, index) => (
						// Keyboard use goes through the combobox above.
						// eslint-disable-next-line jsx-a11y/click-events-have-key-events
						<li
							key={option.value}
							id={optionId(index)}
							role="option"
							aria-selected={index === active}
							className={
								index === active
									? 'modula-admin-token-picker__result is-active'
									: 'modula-admin-token-picker__result'
							}
							// Keep focus in the field, so blur does not close
							// the results before the click lands.
							onMouseDown={(event) => event.preventDefault()}
							onClick={() => pick(option)}
						>
							{option.label}
						</li>
					))}
				</ul>
			</div>
			<p
				id={statusId}
				className="modula-admin-token-picker__status"
				role="status"
			>
				{status}
			</p>
		</div>
	);
}
