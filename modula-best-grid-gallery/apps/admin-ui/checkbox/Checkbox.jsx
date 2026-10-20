import { useId } from '@wordpress/element';

/**
 * Native checkbox drawn as the design's 20px box.
 *
 * Pass `label` for visible text, or `aria-label` when the context names it
 * (a matrix cell, for example). `bordered` draws the outlined chip used for
 * multi-choice rows.
 *
 * @param {Object}                    props
 * @param {boolean}                   props.checked
 * @param {Function}                  props.onChange    Receives the next boolean.
 * @param {import('react').ReactNode} [props.label]
 * @param {boolean}                   [props.disabled]
 * @param {boolean}                   [props.bordered]
 * @param {string}                    [props.id]
 * @param {string}                    [props.className]
 */
export function Checkbox({
	checked = false,
	onChange,
	label,
	disabled = false,
	bordered = false,
	id: idProp,
	className = '',
	...rest
}) {
	const generatedId = useId();
	const id = idProp || `modula-admin-checkbox-${generatedId}`;
	const classes = [
		'modula-admin-checkbox',
		bordered ? 'is-bordered' : '',
		checked ? 'is-checked' : '',
		className,
	]
		.filter(Boolean)
		.join(' ');

	return (
		<label className={classes} htmlFor={id}>
			<input
				id={id}
				type="checkbox"
				className="modula-admin-checkbox__input"
				checked={checked}
				disabled={disabled}
				onChange={(event) => onChange?.(event.target.checked)}
				{...rest}
			/>
			<span className="modula-admin-checkbox__box" aria-hidden="true">
				<svg
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2.4"
					strokeLinecap="round"
					strokeLinejoin="round"
				>
					<path d="M5 12l5 5 9-10" />
				</svg>
			</span>
			{label ? (
				<span className="modula-admin-checkbox__label">{label}</span>
			) : null}
		</label>
	);
}
