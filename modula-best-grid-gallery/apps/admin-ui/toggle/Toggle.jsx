/**
 * On/off switch: a 40×22 track inside a 44px hit target.
 *
 * Name it with a visible `<label htmlFor={id}>` (SettingsRow does this),
 * `aria-labelledby` or `aria-label`.
 *
 * @param {Object}   props
 * @param {boolean}  props.checked
 * @param {Function} props.onChange    Receives the next boolean.
 * @param {boolean}  [props.disabled]
 * @param {string}   [props.id]
 * @param {string}   [props.className]
 */
export function Toggle({
	checked = false,
	onChange,
	disabled = false,
	id,
	className = '',
	...rest
}) {
	const classes = [
		'modula-admin-toggle',
		checked ? 'is-checked' : '',
		className,
	]
		.filter(Boolean)
		.join(' ');

	return (
		<button
			id={id}
			type="button"
			role="switch"
			className={classes}
			aria-checked={checked}
			disabled={disabled}
			onClick={() => onChange?.(!checked)}
			{...rest}
		>
			<span className="modula-admin-toggle__track" aria-hidden="true">
				<span className="modula-admin-toggle__knob" />
			</span>
		</button>
	);
}
