/**
 * Stacked field of an item edit card: the label with its ⓘ help (nothing
 * renders under a field in the panel), actions at the line's end (such as AI
 * Generate), then the control.
 */
import FieldHelpInfoTip from '../schema/FieldHelpInfoTip';

/**
 * @param {Object}                    props
 * @param {string}                    props.label
 * @param {string}                    [props.controlId] Labels the control; omit for a control named by `aria-label`.
 * @param {import('react').ReactNode} [props.labelEnd]  Actions after the label, outside the `<label>`.
 * @param {string}                    [props.help]      Shown in the ⓘ after the label.
 * @param {import('react').ReactNode} props.children
 */
export default function ItemEditField({
	label,
	controlId,
	labelEnd = null,
	help = '',
	children,
}) {
	return (
		<div className="modula-gallery-item-edit-panel__field">
			<div className="modula-gallery-item-edit-panel__field-label-line">
				<span className="modula-gallery-item-edit-panel__field-label-with-tip">
					{controlId ? (
						<label
							htmlFor={controlId}
							className="modula-gallery-item-edit-panel__field-label"
						>
							{label}
						</label>
					) : (
						<span className="modula-gallery-item-edit-panel__field-label">
							{label}
						</span>
					)}
					<FieldHelpInfoTip field={{ editorTooltip: help }} />
				</span>
				{labelEnd}
			</div>
			{children}
		</div>
	);
}
