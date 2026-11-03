import { __ } from '@wordpress/i18n';
import { PositionPad } from 'admin-ui';
import { isNil } from '../../../logic/isNil';
import { ControlHelp, describedByHelp } from './ControlHelp';

const WATERMARK_CELLS = [
	'top_left',
	'top_center',
	'top_right',
	'middle_left',
	'center',
	'middle_right',
	'bottom_left',
	'bottom_center',
	'bottom_right',
];

/**
 * @param {Object} control
 * @return {string} Name of the position group.
 */
function positionGroupLabel(control) {
	if (
		typeof control.ariaLabel === 'string' &&
		control.ariaLabel.trim() !== ''
	) {
		return control.ariaLabel.trim();
	}

	return __('Watermark position', 'modula-best-grid-gallery');
}

/**
 * 3×3 position matrix for watermark placement. The nine image places are
 * admin-ui's PositionPad; a set missing some places keeps its own grid with
 * those places off. (The filter bar's place is a menu select.)
 *
 * @param {import('../fieldControlKinds').FieldControlContext} ctx
 */
export function renderPositionGridKind({
	control,
	controlId,
	value,
	onChange,
	disabled,
	help,
}) {
	const labels = control.optionLabels || {};
	const options = Array.isArray(control.options)
		? control.options.map(String)
		: WATERMARK_CELLS;
	const available = new Set(options);
	const fallback = String(options[0] ?? 'bottom_left');
	const current = isNil(value) || value === '' ? fallback : String(value);
	const groupLabel = positionGroupLabel(control);

	// PositionPad draws exactly the nine places, none of them off.
	if (WATERMARK_CELLS.every((key) => available.has(key))) {
		return (
			<div className="modula-settings-editor__position-grid">
				<PositionPad
					id={controlId}
					aria-label={groupLabel}
					aria-describedby={describedByHelp(controlId, help)}
					positions={WATERMARK_CELLS.map((key) => ({
						value: key,
						label: labels[key] || key,
					}))}
					value={current}
					onChange={onChange}
					disabled={disabled}
				/>
				<ControlHelp help={help} controlId={controlId} />
			</div>
		);
	}

	return (
		<div className="modula-settings-editor__position-grid">
			<div
				className="modula-settings-editor__position-grid-matrix"
				role="radiogroup"
				aria-label={groupLabel}
			>
				{WATERMARK_CELLS.map((key) => {
					const isAvailable = available.has(key);
					const active = isAvailable && current === key;
					return (
						<button
							key={key}
							type="button"
							role="radio"
							aria-checked={active}
							aria-label={labels[key] || key}
							disabled={disabled || !isAvailable}
							className={`modula-settings-editor__position-grid-cell${
								active ? ' is-active' : ''
							}${!isAvailable ? ' is-unavailable' : ''}`}
							onClick={() => {
								if (!disabled && isAvailable) {
									onChange(key);
								}
							}}
						/>
					);
				})}
			</div>
			<ControlHelp help={help} controlId={controlId} />
		</div>
	);
}
