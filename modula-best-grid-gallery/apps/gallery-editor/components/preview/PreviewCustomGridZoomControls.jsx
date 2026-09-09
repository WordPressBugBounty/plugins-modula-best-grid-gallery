/**
 * Takeover preview toolbar: zoom out / in the custom-grid live preview.
 */
import {
	CUSTOM_GRID_PREVIEW_SCALE_MAX,
	CUSTOM_GRID_PREVIEW_SCALE_MIN,
	CUSTOM_GRID_PREVIEW_SCALE_STEP,
	useGalleryPreviewCustomGridScale,
} from 'gallery-shared/preview';
import { __ } from '@wordpress/i18n';

/**
 * @param {{ galleryType?: string, previewViewport?: 'desktop'|'tablet'|'mobile' }} props
 */
export default function PreviewCustomGridZoomControls({
	galleryType = '',
	previewViewport = 'desktop',
}) {
	const { scale, setScale } = useGalleryPreviewCustomGridScale();

	if (galleryType !== 'custom-grid' || previewViewport !== 'desktop') {
		return null;
	}

	const pct = Math.round(scale * 100);
	const canOut = scale > CUSTOM_GRID_PREVIEW_SCALE_MIN + 1e-6;
	const canIn = scale < CUSTOM_GRID_PREVIEW_SCALE_MAX - 1e-6;

	return (
		<div
			className="modula-gallery-takeover__preview-custom-grid-zoom"
			role="group"
			aria-label={__(
				'Custom grid preview size',
				'modula-best-grid-gallery'
			)}
		>
			<span
				className="modula-gallery-takeover__preview-custom-grid-zoom__label"
				id="modula-preview-custom-grid-zoom-label"
			>
				{__('Preview', 'modula-best-grid-gallery')}
			</span>
			<button
				type="button"
				className="modula-gallery-takeover__preview-custom-grid-zoom__btn"
				disabled={!canOut}
				aria-controls="modula-preview-custom-grid-zoom-value"
				aria-label={__(
					'Zoom out: show more of the grid in the preview',
					'modula-best-grid-gallery'
				)}
				onClick={() =>
					setScale((s) => s - CUSTOM_GRID_PREVIEW_SCALE_STEP)
				}
			>
				−
			</button>
			<span
				className="modula-gallery-takeover__preview-custom-grid-zoom__value"
				id="modula-preview-custom-grid-zoom-value"
				aria-live="polite"
			>
				{pct}%
			</span>
			<button
				type="button"
				className="modula-gallery-takeover__preview-custom-grid-zoom__btn"
				disabled={!canIn}
				aria-label={__(
					'Zoom in: larger tiles in the preview',
					'modula-best-grid-gallery'
				)}
				onClick={() =>
					setScale((s) => s + CUSTOM_GRID_PREVIEW_SCALE_STEP)
				}
			>
				+
			</button>
		</div>
	);
}
