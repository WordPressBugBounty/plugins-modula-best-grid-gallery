/**
 * @typedef {{ value: string, label: string, disabled?: boolean }} SegmentedOption
 */

/**
 * @param {Object}             props
 * @param {SegmentedOption[]}  props.options
 * @param {string}             props.value
 * @param {Function}           props.onChange Receives option value string
 * @param {boolean}            [props.disabled]
 * @param {string}             [props.className]
 * @param {string}             [props['aria-label']]
 */
export function Segmented({
	options = [],
	value,
	onChange,
	disabled = false,
	className = '',
	'aria-label': ariaLabel,
}) {
	const classes = ['modula-ui-segmented', className]
		.filter(Boolean)
		.join(' ');

	return (
		<div className={classes} role="group" aria-label={ariaLabel}>
			{options.map((opt) => {
				const key = String(opt.value);
				const isActive = String(value) === key;
				const isDisabled = disabled || Boolean(opt.disabled);
				return (
					<button
						key={key}
						type="button"
						className={
							isActive
								? 'modula-ui-segmented__btn is-active'
								: 'modula-ui-segmented__btn'
						}
						aria-pressed={isActive}
						disabled={isDisabled}
						onClick={() => {
							if (!isDisabled && typeof onChange === 'function') {
								onChange(key);
							}
						}}
					>
						{opt.label}
					</button>
				);
			})}
		</div>
	);
}
