/**
 * @typedef {{ value: string, label: string, count?: number, icon?: import('react').ReactNode, disabled?: boolean }} SegmentedOption
 */

/**
 * One-of-several choice drawn as a pill track. Each option is a pressed
 * button, as in the design, so the group needs `aria-label` or
 * `aria-labelledby`. An option's `count` follows its label, as "(24)".
 * An option with an `icon` shows only the icon (the editor's device
 * switch); its label becomes the button's name and tooltip.
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
				const hasIcon = undefined !== option.icon;

				return (
					<button
						key={optionValue}
						type="button"
						className={[
							'modula-admin-segmented__option',
							isActive ? 'is-active' : '',
							hasIcon ? 'is-icon' : '',
						]
							.filter(Boolean)
							.join(' ')}
						aria-pressed={isActive}
						aria-label={hasIcon ? option.label : undefined}
						title={hasIcon ? option.label : undefined}
						disabled={isDisabled}
						onClick={() => onChange?.(optionValue)}
					>
						{hasIcon ? option.icon : option.label}
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
