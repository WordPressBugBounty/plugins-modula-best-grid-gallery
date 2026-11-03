/**
 * Code-split entry for the takeover live gallery preview (gallery-shared + Redux).
 */
import { lazy } from '@wordpress/element';
import { Spinner } from 'admin-ui';
import { AdminUiScope } from 'editor-shell';
import { __ } from '@wordpress/i18n';
import LazySettingsEditorBoundary from '../shell/LazySettingsEditorBoundary';

const GalleryTakeoverLivePreview = lazy(
	() => import('./GalleryTakeoverLivePreview')
);

/**
 * @param {React.ComponentProps<typeof GalleryTakeoverLivePreview>} props
 */
export default function GalleryTakeoverLivePreviewLazy(props) {
	return (
		<LazySettingsEditorBoundary
			fallback={
				<div
					className="modula-gallery-takeover__preview-loading"
					role="status"
					aria-live="polite"
					aria-busy="true"
				>
					<AdminUiScope>
						<Spinner />
					</AdminUiScope>
					<span>
						{__('Loading preview…', 'modula-best-grid-gallery')}
					</span>
				</div>
			}
		>
			<GalleryTakeoverLivePreview {...props} />
		</LazySettingsEditorBoundary>
	);
}
