import { CloseIcon } from '../icons/icons';

/**
 * The editor's reset dot: a dot that marks a changed value or section and
 * turns into a cross on hover or keyboard focus. The caller renders it only
 * while there is something to reset. The dot carries no text, so `label`
 * names the action ("Reset Lightbox to defaults").
 *
 * @param {Object}   props
 * @param {string}   props.label       Accessible name and tooltip.
 * @param {Function} props.onReset
 * @param {boolean}  [props.disabled]
 * @param {string}   [props.className]
 */
export function ResetButton({
	label,
	onReset,
	disabled = false,
	className = '',
}) {
	return (
		<button
			type="button"
			className={['modula-admin-reset', className]
				.filter(Boolean)
				.join(' ')}
			aria-label={label}
			title={label}
			disabled={disabled}
			onClick={() => onReset?.()}
		>
			<span className="modula-admin-reset__dot" aria-hidden="true" />
			<span className="modula-admin-reset__cross" aria-hidden="true">
				<CloseIcon />
			</span>
		</button>
	);
}
