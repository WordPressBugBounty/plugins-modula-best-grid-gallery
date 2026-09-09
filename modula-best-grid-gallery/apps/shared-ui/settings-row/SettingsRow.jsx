import { DirtyMark } from '../dirty-mark/DirtyMark';
import { ResetToDefaultButton } from '../dirty-mark/ResetToDefaultButton';

/**
 * Settings list row: label · value · end (chevron XOR switch).
 *
 * @param {Object} props
 * @param {import('react').ReactNode} props.label
 * @param {import('react').ReactNode} [props.value]
 * @param {import('react').ReactNode} [props.end]
 * @param {Function} [props.onActivate] Makes the row a button (drill)
 * @param {boolean} [props.disabled]
 * @param {boolean} [props.dirty] Shows accent dirty circle
 * @param {Function} [props.onReset] Reset to schema default (shown when dirty)
 * @param {string} [props.className]
 * @param {string} [props.help]
 */
export function SettingsRow({
	label,
	value,
	end,
	onActivate,
	disabled = false,
	dirty = false,
	onReset,
	className = '',
	help,
	...rest
}) {
	const interactive = typeof onActivate === 'function';
	const showReset = dirty && typeof onReset === 'function';
	const classes = [
		'modula-ui-settings-row',
		interactive ? 'is-interactive' : '',
		disabled ? 'is-disabled' : '',
		dirty ? 'is-dirty' : '',
		className,
	]
		.filter(Boolean)
		.join(' ');

	const { 'aria-label': ariaLabel, ...divRest } = rest;

	const handleReset = (event) => {
		event.preventDefault();
		event.stopPropagation();
		onReset();
	};

	const hitLabel =
		typeof ariaLabel === 'string' && ariaLabel.trim() !== ''
			? ariaLabel
			: typeof label === 'string'
				? label
				: undefined;

	return (
		<div className={classes} {...divRest}>
			{dirty ? (
				<DirtyMark className="modula-ui-settings-row__dirty" />
			) : null}
			{interactive ? (
				<button
					type="button"
					className="modula-ui-settings-row__hit"
					disabled={disabled}
					aria-label={hitLabel}
					onClick={onActivate}
				/>
			) : null}
			<span className="modula-ui-settings-row__copy">
				<span className="modula-ui-settings-row__label-cluster">
					<span className="modula-ui-settings-row__label">
						{label}
					</span>
					{showReset ? (
						<ResetToDefaultButton onClick={handleReset} />
					) : null}
				</span>
				{value !== undefined && value !== null && value !== '' ? (
					<span className="modula-ui-settings-row__value">
						{value}
					</span>
				) : null}
				{help ? (
					<span className="modula-ui-settings-row__help">{help}</span>
				) : null}
			</span>
			{end ? (
				<span className="modula-ui-settings-row__end">{end}</span>
			) : null}
		</div>
	);
}
