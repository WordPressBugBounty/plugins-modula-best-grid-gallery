/**
 * Opens the Instagram import/manage modal from the Advanced drill.
 */
import { Button } from 'admin-ui';
import { __ } from '@wordpress/i18n';
import { requestExtensionImportOpen } from '../../platform/extensionImportRegistry';

/**
 * @param {{
 *   buttonLabel?: string,
 *   disabled?: boolean,
 * }} props
 */
export default function InstagramManagePhotosButton({
	buttonLabel,
	disabled = false,
}) {
	const label =
		typeof buttonLabel === 'string' && buttonLabel.trim() !== ''
			? buttonLabel.trim()
			: __('Manage photos', 'modula-best-grid-gallery');

	return (
		<div className="modula-settings-editor__action-button-wrap">
			<Button
				disabled={disabled}
				onClick={() => requestExtensionImportOpen('instagram')}
			>
				{label}
			</Button>
		</div>
	);
}
