/**
 * Help copy for Modula Pro Speed Up–style compression fields (see modula-pro speedup admin).
 * Where compression cannot run, it leads with the Settings page's note.
 */

import { __ } from '@wordpress/i18n';
import { IconNote } from 'admin-ui';
import { useModulaSettingsEditorConfig } from '../../hooks/useModulaSettingsEditorConfig';
import { isCompressionAvailable } from '../../logic/compressionAvailability';

export default function SpeedupHelpBlurb() {
	const editor = useModulaSettingsEditorConfig();

	return (
		<div className="modula-settings-editor__speedup-help">
			{!isCompressionAvailable(editor) && (
				<IconNote>
					{__(
						'Not available on a local site.',
						'modula-best-grid-gallery'
					)}
				</IconNote>
			)}
			<p>
				{__(
					'Thumbnail and lightbox compression levels follow the same options as Modula Pro → Speed Up. Use Default to inherit global behavior, or pick a level per gallery when optimization is enabled.',
					'modula-best-grid-gallery'
				)}
			</p>
		</div>
	);
}
