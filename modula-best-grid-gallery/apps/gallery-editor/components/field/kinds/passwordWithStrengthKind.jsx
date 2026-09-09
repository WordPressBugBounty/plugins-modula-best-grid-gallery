import { useMemo, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Icon, seen, unseen } from '@wordpress/icons';
import { IconButton, TextInput } from 'shared-ui';
import { isNil } from '../../../logic/isNil';
import { getPasswordStrengthMeta } from '../../../utils/passwordStrengthMeter';

/**
 * Gallery password field with optional reveal + WP password strength meter.
 *
 * @param {Object}           props
 * @param {*}                props.value
 * @param {Function}         props.onChange
 * @param {boolean}          props.disabled
 * @param {string|undefined} props.help
 */
export function renderPasswordWithStrengthKind({
	value,
	onChange,
	disabled,
	help,
}) {
	return (
		<PasswordWithStrengthControl
			value={value}
			onChange={onChange}
			disabled={disabled}
			help={help}
		/>
	);
}

/**
 * @param {Object}           props
 * @param {*}                props.value
 * @param {Function}         props.onChange
 * @param {boolean}          props.disabled
 * @param {string|undefined} props.help
 */
function PasswordWithStrengthControl({ value, onChange, disabled, help }) {
	const [revealed, setRevealed] = useState(false);
	const text = isNil(value) ? '' : String(value);
	const strength = useMemo(() => getPasswordStrengthMeta(text), [text]);
	const revealLabel = revealed
		? __('Hide password', 'modula-best-grid-gallery')
		: __('Show password', 'modula-best-grid-gallery');

	return (
		<div className="modula-settings-editor__password-with-strength">
			<div className="modula-settings-editor__password-with-strength-input">
				<TextInput
					type={revealed ? 'text' : 'password'}
					value={text}
					onChange={onChange}
					disabled={disabled}
					autoComplete="new-password"
					spellCheck={false}
				/>
				<IconButton
					label={revealLabel}
					disabled={disabled}
					className="modula-settings-editor__password-visibility-toggle"
					aria-pressed={revealed}
					onClick={() => setRevealed((prev) => !prev)}
				>
					<Icon icon={revealed ? unseen : seen} size={20} />
				</IconButton>
			</div>
			{strength.level !== 'empty' ? (
				<div
					className={`modula-settings-editor__password-strength modula-settings-editor__password-strength--${strength.level}`}
					role="status"
					aria-live="polite"
				>
					{strength.label}
				</div>
			) : null}
			{help ? (
				<p className="modula-settings-editor__password-with-strength-help">
					{help}
				</p>
			) : null}
		</div>
	);
}
