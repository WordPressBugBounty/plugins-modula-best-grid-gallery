/**
 * Neutral gallery block for filter positioning preview (no real images).
 */
import { __ } from '@wordpress/i18n';

export default function FiltersPreviewGalleryStub() {
	return (
		<div
			className="modula-items modula-gallery-takeover__filters-preview-gallery-stub"
			aria-hidden="true"
		>
			<span className="modula-gallery-takeover__filters-preview-gallery-stub-label">
				{__('Gallery', 'modula-best-grid-gallery')}
			</span>
		</div>
	);
}
