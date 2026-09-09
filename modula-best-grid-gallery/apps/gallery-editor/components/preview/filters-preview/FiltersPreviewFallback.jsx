/**
 * Shown when no filter names are configured yet.
 */
import { __ } from '@wordpress/i18n';

export default function FiltersPreviewFallback() {
	return (
		<div className="modula-gallery-takeover__filters-preview modula-gallery-takeover__filters-preview--empty">
			<p>
				{__(
					'Add filter names to preview how the filter bar will look on your gallery.',
					'modula-best-grid-gallery'
				)}
			</p>
		</div>
	);
}
