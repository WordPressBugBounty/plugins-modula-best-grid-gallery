/**
 * Optional info-tip (the “i” control). Uses `editorTooltip` only — not `editorDescription`.
 * `editorDescription` is the help text under the field control. Tip UI stays available when a field sets editorTooltip.
 */

import { Tooltip } from '@wordpress/components';
import { Icon, info } from '@wordpress/icons';

/**
 * @param {Object} props
 * @param {Object} props.field Form field descriptor
 * @param {string} [props.path] Reserved for debugging; not shown when tip text is missing.
 */
export default function FieldHelpInfoTip({ field }) {
	const tipText =
		typeof field?.editorTooltip === 'string'
			? field.editorTooltip.trim()
			: '';
	if (!tipText) {
		return null;
	}
	return (
		<Tooltip text={tipText} delay={0} hideOnClick={false}>
			<button
				type="button"
				className="modula-settings-editor__field-path-tip"
				aria-label={tipText}
			>
				<Icon icon={info} size={16} />
			</button>
		</Tooltip>
	);
}
