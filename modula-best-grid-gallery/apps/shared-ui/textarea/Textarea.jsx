import { forwardRef, useId } from '@wordpress/element';

/**
 * @param {Object}   props
 * @param {string}   [props.value]
 * @param {Function} [props.onChange] Receives string
 * @param {boolean}  [props.disabled]
 * @param {string}   [props.help]
 * @param {string}   [props.placeholder]
 * @param {number}   [props.rows=4]
 * @param {string}   [props.className]
 * @param {string}   [props.id]
 */
export const Textarea = forwardRef(function Textarea(
	{
		value = '',
		onChange,
		disabled = false,
		help,
		placeholder,
		rows = 4,
		className = '',
		id: idProp,
		...rest
	},
	ref
) {
	const genId = useId();
	const id = idProp || `modula-ui-textarea-${genId}`;
	const classes = ['modula-ui-textarea', className].filter(Boolean).join(' ');

	return (
		<div className={classes}>
			<textarea
				ref={ref}
				id={id}
				className="modula-ui-textarea__field"
				value={value}
				placeholder={placeholder}
				disabled={disabled}
				rows={rows}
				onChange={(e) => {
					if (typeof onChange === 'function') {
						onChange(e.target.value);
					}
				}}
				{...rest}
			/>
			{help ? <p className="modula-ui-textarea__help">{help}</p> : null}
		</div>
	);
});
