import { forwardRef, useId } from '@wordpress/element';

/**
 * @param {Object}   props
 * @param {string}   [props.value]
 * @param {Function} [props.onChange] Receives string
 * @param {string}   [props.type='text']
 * @param {boolean}  [props.disabled]
 * @param {string}   [props.help]
 * @param {string}   [props.placeholder]
 * @param {string}   [props.className]
 * @param {string}   [props.id]
 */
export const TextInput = forwardRef(function TextInput(
	{
		value = '',
		onChange,
		type = 'text',
		disabled = false,
		help,
		placeholder,
		className = '',
		id: idProp,
		...rest
	},
	ref
) {
	const genId = useId();
	const id = idProp || `modula-ui-text-${genId}`;
	const classes = ['modula-ui-text-input', className]
		.filter(Boolean)
		.join(' ');

	return (
		<div className={classes}>
			<input
				ref={ref}
				id={id}
				type={type}
				className="modula-ui-text-input__field"
				value={value}
				placeholder={placeholder}
				disabled={disabled}
				onChange={(e) => {
					if (typeof onChange === 'function') {
						onChange(e.target.value);
					}
				}}
				{...rest}
			/>
			{help ? <p className="modula-ui-text-input__help">{help}</p> : null}
		</div>
	);
});
