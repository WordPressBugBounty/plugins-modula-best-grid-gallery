/**
 * Switch row of an item edit card with its help in the ⓘ after the label
 * (Lock position, the Image focus switches).
 */
import { useId } from '@wordpress/element';
import { SettingsRow, Toggle } from 'admin-ui';
import FieldHelpInfoTip from '../schema/FieldHelpInfoTip';

/**
 * @param {Object}                     props
 * @param {string}                     props.label
 * @param {string}                     props.help
 * @param {boolean}                    props.checked
 * @param {(checked: boolean) => void} props.onChange
 * @param {boolean}                    [props.disabled]
 */
export default function ItemEditTipToggleRow({
	label,
	help,
	checked,
	onChange,
	disabled = false,
}) {
	const controlId = `modula-item-toggle-${useId()}`;
	return (
		<SettingsRow
			label={
				<span className="modula-gallery-item-edit-panel__field-label-with-tip">
					{label}
					<FieldHelpInfoTip field={{ editorTooltip: help }} />
				</span>
			}
			controlId={controlId}
		>
			<Toggle
				id={controlId}
				// The row's label also holds the ⓘ button; name the switch by
				// its text alone.
				aria-label={label}
				checked={checked}
				disabled={disabled}
				onChange={onChange}
			/>
		</SettingsRow>
	);
}
