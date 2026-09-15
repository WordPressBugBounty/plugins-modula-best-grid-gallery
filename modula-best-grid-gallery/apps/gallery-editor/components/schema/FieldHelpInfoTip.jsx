/**
 * Optional info-tip (the “i” control).
 * Uses editorTooltip and/or editorDescription without duplicating identical copy.
 * Under-control help is intentionally empty in the compact settings panel.
 */

import { Tooltip } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { Icon, info } from '@wordpress/icons';
import { resolveFieldHelpTipText } from '../field/fieldControlHelp';

/**
 * @param {Object} props
 * @param {Object} props.field Form field descriptor
 * @param {string} [props.path] Reserved for debugging; not shown when tip text is missing.
 */
export default function FieldHelpInfoTip({ field }) {
	const tipText = resolveFieldHelpTipText(field);
	if (!tipText) {
		return null;
	}
	const tipName = __('More information', 'modula-best-grid-gallery');
	return (
		<Tooltip text={tipText} delay={0} hideOnClick={false}>
			<button
				type="button"
				className="modula-settings-editor__field-path-tip"
				aria-label={tipName}
			>
				<Icon icon={info} size={16} />
			</button>
		</Tooltip>
	);
}
