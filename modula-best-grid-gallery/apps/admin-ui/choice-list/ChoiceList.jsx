import { useRef } from '@wordpress/element';
import { menuIndexForKey } from '../menu/menuKeys';
import { tabKeyTarget } from '../tabs/tabKeyTarget';

/**
 * @typedef {Object} ChoiceListOption
 * @property {string}                    value      Reported to `onChange`.
 * @property {string}                    label      Row text and name.
 * @property {import('react').ReactNode} [badge]    After the label, e.g. a PlanBadge (without `onClick`).
 * @property {boolean}                   [disabled] Turns this row off.
 */

/**
 * One-of-several choice drawn as a radio group of full-width rows (the
 * editor's Sort by): a ring before each label, filled on the chosen row.
 * Name the group with `aria-label` or `aria-labelledby`.
 *
 * Only the chosen row is in the tab order; the arrow keys, Home and End move
 * focus between rows, and Space, Enter or a click chooses one. Focus does not
 * choose, because a choice can be an action (Sort by re-sorts and saves the
 * gallery) that stepping past it must not run.
 *
 * @param {Object}             props
 * @param {ChoiceListOption[]} props.options
 * @param {string}             props.value
 * @param {Function}           props.onChange    Receives the row value.
 * @param {boolean}            [props.disabled]
 * @param {string}             [props.className]
 */
export function ChoiceList({
	options = [],
	value,
	onChange,
	disabled = false,
	className = '',
	...rest
}) {
	const groupRef = useRef(null);
	const isOptionEnabled = (option) => !disabled && option.disabled !== true;
	const enabledValues = options
		.filter(isOptionEnabled)
		.map((option) => String(option.value));
	const tabStop = enabledValues.includes(String(value))
		? String(value)
		: enabledValues[0];

	const focusOption = (optionValue) => {
		const rows = groupRef.current.querySelectorAll('[role="radio"]');
		Array.from(rows)
			.find((row) => row.dataset.value === optionValue)
			?.focus();
	};

	// Up and Down move as in a menu, Left and Right as in a tab list.
	const onKeyDown = (event) => {
		const current = enabledValues.indexOf(
			event.currentTarget.dataset.value
		);
		const count = enabledValues.length;
		const next =
			menuIndexForKey(event.key, current, count) ??
			tabKeyTarget(event.key, current, count);
		if (null === next) {
			return;
		}
		event.preventDefault();
		focusOption(enabledValues[next]);
	};

	return (
		<div
			ref={groupRef}
			className={['modula-admin-choice-list', className]
				.filter(Boolean)
				.join(' ')}
			role="radiogroup"
			{...rest}
		>
			{options.map((option) => {
				const optionValue = String(option.value);
				const isActive = String(value) === optionValue;

				return (
					<button
						key={optionValue}
						type="button"
						role="radio"
						data-value={optionValue}
						className={
							isActive
								? 'modula-admin-choice-list__option is-active'
								: 'modula-admin-choice-list__option'
						}
						aria-checked={isActive}
						tabIndex={optionValue === tabStop ? 0 : -1}
						// In a Popover, focus starts on the chosen row, as in Menu.
						data-autofocus={
							optionValue === tabStop ? 'true' : undefined
						}
						disabled={!isOptionEnabled(option)}
						onClick={() => onChange?.(optionValue)}
						onKeyDown={onKeyDown}
					>
						<span
							className="modula-admin-choice-list__ring"
							aria-hidden="true"
						/>
						<span className="modula-admin-choice-list__label">
							{option.label}
						</span>
						{option.badge ?? null}
					</button>
				);
			})}
		</div>
	);
}
