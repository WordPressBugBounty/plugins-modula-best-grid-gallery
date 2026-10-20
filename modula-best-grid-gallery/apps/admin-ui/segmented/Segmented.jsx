/**
 * @typedef {{ value: string, label: string, count?: number, disabled?: boolean }} SegmentedOption
 */

/**
 * One-of-several choice drawn as a pill track. Each option is a pressed
 * button, as in the design, so the group needs `aria-label` or
 * `aria-labelledby`. An option's `count` follows its label, as "(24)".
 *
 * @param {Object}            props
 * @param {SegmentedOption[]} props.options
 * @param {string}            props.value
 * @param {Function}          props.onChange    Receives the option value.
 * @param {boolean}           [props.disabled]
 * @param {string}            [props.className]
 */
export function Segmented({
	options = [],
	value,
	onChange,
	disabled = false,
	className = '',
	...rest
}) {
	const classes = [
		'modula-admin-segmented',
		disabled ? 'is-disabled' : '',
		className,
	]
		.filter(Boolean)
		.join(' ');

	return (
		<div className={classes} role="group" {...rest}>
			{options.map((option) => {
				const optionValue = String(option.value);
				const isActive = String(value) === optionValue;
				const isDisabled = disabled || option.disabled === true;

				return (
					<button
						key={optionValue}
						type="button"
						className={
							isActive
								? 'modula-admin-segmented__option is-active'
								: 'modula-admin-segmented__option'
						}
						aria-pressed={isActive}
						disabled={isDisabled}
						onClick={() => onChange?.(optionValue)}
					>
						{option.label}
						{undefined === option.count ? null : (
							<span className="modula-admin-segmented__count">
								({option.count})
							</span>
						)}
					</button>
				);
			})}
		</div>
	);
}
