/**
 * Static copy for Modula Pro Speed Up–style compression fields (see modula-pro speedup admin).
 */

import { __ } from '@wordpress/i18n';

export default function SpeedupHelpBlurb() {
	return (
		<div className="modula-settings-editor__speedup-help">
			<p>
				{__(
					'Thumbnail and lightbox compression levels follow the same options as Modula Pro → Speed Up. Use Default to inherit global behavior, or pick a level per gallery when optimization is enabled.',
					'modula-best-grid-gallery'
				)}
			</p>
		</div>
	);
}
