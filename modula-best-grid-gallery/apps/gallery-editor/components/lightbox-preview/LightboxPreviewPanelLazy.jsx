/**
 * Code-split entry for the Lightbox category Fancybox preview.
 */
import { lazy } from '@wordpress/element';
import { Spinner } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import LazySettingsEditorBoundary from '../shell/LazySettingsEditorBoundary';

const LightboxPreviewPanel = lazy(() => import('./LightboxPreviewPanel'));

/**
 * @param {React.ComponentProps<typeof LightboxPreviewPanel>} props
 */
export default function LightboxPreviewPanelLazy(props) {
	return (
		<LazySettingsEditorBoundary
			fallback={
				<div
					className="modula-gallery-takeover__lightbox-preview modula-gallery-takeover__lightbox-preview--loading"
					role="status"
					aria-live="polite"
					aria-busy="true"
				>
					<Spinner />
					<span>
						{__(
							'Loading lightbox preview…',
							'modula-best-grid-gallery'
						)}
					</span>
				</div>
			}
		>
			<LightboxPreviewPanel {...props} />
		</LazySettingsEditorBoundary>
	);
}
