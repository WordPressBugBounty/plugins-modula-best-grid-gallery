/**
 * Code-split entry for the Lightbox category Fancybox preview.
 */
import { lazy } from '@wordpress/element';
import { Spinner } from 'admin-ui';
import { AdminUiScope } from 'editor-shell';
import { __ } from '@wordpress/i18n';
import LazySettingsEditorBoundary from '../shell/LazySettingsEditorBoundary';
import { getModulaSettingsEditorConfig } from '../../config/modulaSettingsEditorConfig';
import '../../styles/takeover/preview/_lightbox-preview.scss';

const LightboxPreviewPanel = lazy(
	() => import('gallery-shared/lightbox/LightboxPreviewPanel')
);

/**
 * @param {Omit<React.ComponentProps<typeof LightboxPreviewPanel>, 'shareButtons'|'exifCaption'>} props
 */
export default function LightboxPreviewPanelLazy(props) {
	const editorConfig = getModulaSettingsEditorConfig();
	return (
		<LazySettingsEditorBoundary
			fallback={
				<div
					className="modula-gallery-takeover__lightbox-preview modula-gallery-takeover__lightbox-preview--loading"
					role="status"
					aria-live="polite"
					aria-busy="true"
				>
					<AdminUiScope>
						<Spinner />
					</AdminUiScope>
					<span>
						{__(
							'Loading lightbox preview…',
							'modula-best-grid-gallery'
						)}
					</span>
				</div>
			}
		>
			<LightboxPreviewPanel
				{...props}
				shareButtons={editorConfig.lightboxShareButtons}
				exifCaption={editorConfig.exifCaption}
			/>
		</LazySettingsEditorBoundary>
	);
}
