import { useId } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

/**
 * Pill switch — track 40×20, knob 16; optional On/Off status (style kit).
 *
 * @param {Object}   props
 * @param {boolean}  props.checked
 * @param {Function} props.onChange Receives next boolean
 * @param {boolean}  [props.disabled]
 * @param {string}   [props.label] Optional adjacent label (prefer SettingsRow label)
 * @param {boolean}  [props.showStatus] Shows On/Off text beside the track
 * @param {string}   [props.help] Optional help under the control
 * @param {string}   [props.className]
 * @param {string}   [props.id]
 * @param {string}   [props['aria-labelledby']]
 */
export function Switch({
	checked = false,
	onChange,
	disabled = false,
	label = '',
	showStatus = false,
	help,
	className = '',
	id: idProp,
	'aria-labelledby': ariaLabelledBy,
	...rest
}) {
	const genId = useId();
	const id = idProp || `modula-ui-switch-${genId}`;
	const classes = [
		'modula-ui-switch',
		showStatus ? 'has-status' : '',
		className,
	]
		.filter(Boolean)
		.join(' ');

	const statusLabel = checked
		? __('On', 'modula-best-grid-gallery')
		: __('Off', 'modula-best-grid-gallery');

	return (
		<div className={classes}>
			{label ? (
				<label className="modula-ui-switch__label" htmlFor={id}>
					{label}
				</label>
			) : null}
			<div className="modula-ui-switch__control-wrap">
				{showStatus ? (
					<span
						className="modula-ui-switch__status"
						aria-hidden="true"
					>
						{statusLabel}
					</span>
				) : null}
				<button
					id={id}
					type="button"
					role="switch"
					className={
						checked
							? 'modula-ui-switch__control is-checked'
							: 'modula-ui-switch__control'
					}
					aria-checked={checked}
					aria-labelledby={ariaLabelledBy}
					disabled={disabled}
					onClick={() => {
						if (!disabled && typeof onChange === 'function') {
							onChange(!checked);
						}
					}}
					{...rest}
				>
					<span
						className="modula-ui-switch__track"
						aria-hidden="true"
					>
						<span className="modula-ui-switch__knob" />
					</span>
				</button>
			</div>
			{help ? <p className="modula-ui-switch__help">{help}</p> : null}
		</div>
	);
}
