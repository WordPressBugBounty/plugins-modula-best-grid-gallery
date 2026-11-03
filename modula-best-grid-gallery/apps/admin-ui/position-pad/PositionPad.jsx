import { gridIndexForKey } from './gridKeys';

const COLUMNS = 3;

/**
 * @typedef {{ value: string, label: string }} PadPosition
 */

/**
 * Where a mark sits on an image (watermark position), drawn as the image
 * with the mark in one of nine places. It is a radio group: one tab stop
 * (the chosen place), arrow keys move the mark and choose at once, Home and
 * End go to the corners. Name the group with `aria-label` or
 * `aria-labelledby`.
 *
 * @param {Object}                    props
 * @param {PadPosition[]}             props.positions   Nine places, row by row from top left.
 * @param {string}                    props.value
 * @param {Function}                  props.onChange    Receives the place value.
 * @param {import('react').ReactNode} [props.mark]      What sits in the chosen place (watermark text or image); a dot by default.
 * @param {boolean}                   [props.disabled]
 * @param {string}                    [props.className]
 */
export function PositionPad({
	positions,
	value,
	onChange,
	mark = null,
	disabled = false,
	className = '',
	...rest
}) {
	// An unknown value checks no place; the first place is then the tab stop.
	const chosen = positions.findIndex((position) => position.value === value);
	const tabStop = Math.max(0, chosen);

	const onKeyDown = (event) => {
		const next = gridIndexForKey(
			event.key,
			tabStop,
			COLUMNS,
			positions.length
		);
		if (null === next) {
			return;
		}
		event.preventDefault();
		onChange?.(positions[next].value);
		event.currentTarget.querySelectorAll('[role="radio"]')[next].focus();
	};

	return (
		// The radios inside are the interactive elements; the group only
		// routes their arrow keys.
		// eslint-disable-next-line jsx-a11y/interactive-supports-focus
		<div
			className={[
				'modula-admin-position-pad',
				disabled ? 'is-disabled' : '',
				className,
			]
				.filter(Boolean)
				.join(' ')}
			role="radiogroup"
			onKeyDown={disabled ? undefined : onKeyDown}
			{...rest}
		>
			<span
				className="modula-admin-position-pad__guide is-x"
				aria-hidden="true"
			/>
			<span
				className="modula-admin-position-pad__guide is-y"
				aria-hidden="true"
			/>
			{positions.map((position, index) => {
				const isChosen = index === chosen;

				return (
					<button
						key={position.value}
						type="button"
						role="radio"
						className={
							isChosen
								? 'modula-admin-position-pad__cell is-chosen'
								: 'modula-admin-position-pad__cell'
						}
						aria-checked={isChosen}
						aria-label={position.label}
						title={position.label}
						tabIndex={index === tabStop ? 0 : -1}
						disabled={disabled}
						onClick={() => onChange?.(position.value)}
					>
						{isChosen ? (
							<span
								className={
									null === mark
										? 'modula-admin-position-pad__dot'
										: 'modula-admin-position-pad__mark'
								}
								aria-hidden="true"
							>
								{mark}
							</span>
						) : null}
					</button>
				);
			})}
		</div>
	);
}
