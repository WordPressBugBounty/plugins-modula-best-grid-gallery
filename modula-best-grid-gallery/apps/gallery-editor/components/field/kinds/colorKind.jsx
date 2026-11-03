import SettingsColorControl from '../SettingsColorControl';
import { ControlHelp } from './ControlHelp';

/**
 * @param {import('../fieldControlKinds').FieldControlContext} ctx
 */
export function renderColorKind({
	control,
	controlId,
	label,
	value,
	onChange,
	disabled,
	help,
}) {
	return (
		<div className="modula-settings-editor__color-picker modula-settings-editor__color-picker--swatch">
			<SettingsColorControl
				id={controlId}
				label={label}
				value={value}
				onChange={onChange}
				disabled={disabled}
				acceptAlpha={Boolean(control?.acceptAlpha)}
				clearable={Boolean(control?.clearable)}
			/>
			<ControlHelp help={help} controlId={controlId} />
		</div>
	);
}
