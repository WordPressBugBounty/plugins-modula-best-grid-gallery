import { forwardRef, useId } from '@wordpress/element';

/**
 * @typedef {{ value: string, label: string, disabled?: boolean }} SelectOption
 */

/**
 * Native select — 34px, token border/surface, caret outside background (WP-safe).
 *
 * @param {Object}          props
 * @param {SelectOption[]}  props.options
 * @param {string}          [props.value]
 * @param {Function}        [props.onChange] Receives string
 * @param {boolean}         [props.disabled]
 * @param {string}          [props.help]
 * @param {string}          [props.className]
 * @param {string}          [props.id]
 */
export const Select = forwardRef(function Select(
	{
		options = [],
		value = '',
		onChange,
		disabled = false,
		help,
		className = '',
		id: idProp,
		...rest
	},
	ref
) {
	const genId = useId();
	const id = idProp || `modula-ui-select-${genId}`;
	const classes = ['modula-ui-select', className].filter(Boolean).join(' ');

	return (
		<div className={classes}>
			<div className="modula-ui-select__control">
				<select
					ref={ref}
					id={id}
					className="modula-ui-select__field"
					value={value}
					disabled={disabled}
					onChange={(e) => {
						if (typeof onChange === 'function') {
							onChange(e.target.value);
						}
					}}
					{...rest}
				>
					{options.map((opt) => (
						<option
							key={String(opt.value)}
							value={String(opt.value)}
							disabled={Boolean(opt.disabled)}
						>
							{opt.label}
						</option>
					))}
				</select>
				<span className="modula-ui-select__caret" aria-hidden="true" />
			</div>
			{help ? <p className="modula-ui-select__help">{help}</p> : null}
		</div>
	);
});
