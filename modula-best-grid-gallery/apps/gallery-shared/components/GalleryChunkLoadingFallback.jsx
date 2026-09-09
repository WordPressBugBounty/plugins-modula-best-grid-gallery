/**
 * Minimal placeholder while lazy gallery chunks load.
 *
 * @package
 */
import { __ } from '@wordpress/i18n';

export default function GalleryChunkLoadingFallback() {
	return (
		<div
			className="modula-gallery__chunk-loading"
			role="status"
			aria-live="polite"
			aria-busy="true"
		>
			<span className="screen-reader-text">
				{__('Loading gallery…', 'modula-best-grid-gallery')}
			</span>
		</div>
	);
}
