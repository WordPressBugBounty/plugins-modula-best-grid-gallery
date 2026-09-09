/**
 * Preview workspace chrome: left (reorder, bulk edit, custom-grid zoom), centered upload status, add images on the right.
 * Takeover: add media uses {@link TakeoverImageUploader} (REST `/wp/v2/media` + Modula add-images), library uses wp.media + REST. No legacy
 * metabox selectors or Backbone radios. Bulk edit opens the v2 fullscreen modal (Pro + takeover).
 */
import { useEffect, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Button } from 'shared-ui';
import { Notice, Spinner } from '@wordpress/components';
import { Icon, drawerRight, listView } from '@wordpress/icons';
import { useGallerySettingsFormBundle } from '../../form/GallerySettingsFormContext';
import { useInvalidateGalleryBootstrap } from '../../hooks/useInvalidateGalleryBootstrap';
import { ExtensionImportHostProvider } from '../../platform/ExtensionImportHostContext';
import { useGalleryItemEditSidebar } from '../../context/GalleryItemEditSidebarContext';
import { useGalleryReorderSidebar } from '../../context/GalleryReorderSidebarContext';
import { useTakeoverSaveStatus } from '../../context/TakeoverSaveStatusContext';
import { getModulaSettingsEditorConfig } from '../../config/modulaSettingsEditorConfig';
import TakeoverImageUploader from './TakeoverImageUploader';
import PreviewCustomGridZoomControls from './PreviewCustomGridZoomControls';
import { useTakeoverPreviewImportFlows } from '../../hooks/useTakeoverPreviewImportFlows';
import PreviewAddNewSplit from './PreviewAddNewSplit';
import TakeoverPreviewImportModals from '../import-dialog/TakeoverPreviewImportModals';
import { useBulkEdit } from '../../context/BulkEditContext';

/**
 * @param {{
 *   galleryType?: string,
 *   galleryId?: number,
 *   runPreviewItemMutation?: (task: () => void | Promise<void>) => Promise<void>,
 *   previewViewport?: 'desktop'|'tablet'|'mobile',
 * }} props
 */
export default function GalleryTakeoverPreviewChrome({
	galleryType = '',
	galleryId = 0,
	runPreviewItemMutation,
	previewViewport = 'desktop',
}) {
	const { form } = useGallerySettingsFormBundle();
	const { runPersistTask } = useTakeoverSaveStatus();
	const persistItemMutation = runPreviewItemMutation ?? runPersistTask;
	const reorderSidebar = useGalleryReorderSidebar();
	const itemEdit = useGalleryItemEditSidebar();
	const { openBulkEdit } = useBulkEdit();
	const editor = getModulaSettingsEditorConfig();
	const [mediaLibraryError, setMediaLibraryError] = useState('');
	const [pluploadBusy, setPluploadBusy] = useState(false);
	const imageImporterRef = useRef(null);

	const invalidateBootstrap = useInvalidateGalleryBootstrap(galleryId);
	const { openFlow, openPreviewImport, closePreviewImport, zipSession } =
		useTakeoverPreviewImportFlows({ invalidateBootstrap });

	useEffect(() => {
		const onRequestOpen = (event) => {
			const reactFlow =
				event &&
				typeof event === 'object' &&
				event.detail &&
				typeof event.detail.reactFlow === 'string'
					? event.detail.reactFlow.trim()
					: '';
			if (!reactFlow) {
				return;
			}
			openPreviewImport(
				/** @type {'folder' | 'zip' | 'content-galleries' | 'instagram' | 'video' | 'video-playlist'} */ (
					reactFlow
				)
			);
		};
		window.addEventListener(
			'modulaExtensionImportRequestOpen',
			onRequestOpen
		);
		return () =>
			window.removeEventListener(
				'modulaExtensionImportRequestOpen',
				onRequestOpen
			);
	}, [openPreviewImport]);

	return (
		<form.Subscribe
			selector={(s) =>
				s.values?.general?.uploadPosition === 'start' ? 'start' : 'end'
			}
		>
			{(uploadPosition) => (
				<ExtensionImportHostProvider
					value={{
						galleryId,
						uploadPosition,
						invalidateBootstrap,
						runPersistTask: persistItemMutation,
						form,
						config: editor,
					}}
				>
					<div className="modula-gallery-takeover__preview-chrome">
						{mediaLibraryError ? (
							<Notice
								className="modula-gallery-takeover__preview-chrome-notice"
								status="error"
								isDismissible
								onRemove={() => setMediaLibraryError('')}
							>
								{mediaLibraryError}
							</Notice>
						) : null}
						{editor.takeover && galleryId ? (
							<TakeoverImageUploader
								ref={imageImporterRef}
								galleryId={galleryId}
								uploadPosition={uploadPosition}
								runPersistTask={persistItemMutation}
								onBusy={setPluploadBusy}
								onSuccess={() => {
									setMediaLibraryError('');
									invalidateBootstrap();
								}}
								onError={setMediaLibraryError}
							/>
						) : null}
						{editor.takeover && editor.isPro && galleryId ? (
							<TakeoverPreviewImportModals
								galleryId={galleryId}
								editor={editor}
								openFlow={openFlow}
								onClose={closePreviewImport}
								zipSession={zipSession}
							/>
						) : null}

						<div className="modula-gallery-takeover__preview-chrome-main">
							<div className="modula-gallery-takeover__preview-chrome-left">
								{editor.isPro ? (
									<Button
										type="button"
										variant="ghost"
										className="modula-gallery-takeover__preview-action modula-gallery-takeover__preview-action--ghost"
										disabled={!galleryId}
										onClick={() => {
											if (!galleryId) {
												return;
											}
											itemEdit?.close();
											reorderSidebar?.open();
										}}
									>
										<Icon icon={listView} size={18} />
										{__(
											'Reorder images',
											'modula-best-grid-gallery'
										)}
									</Button>
								) : null}
								{editor.isPro ? (
									<Button
										type="button"
										variant="ghost"
										className="modula-gallery-takeover__preview-action modula-gallery-takeover__preview-action--ghost"
										disabled={!galleryId}
										onClick={() => {
											if (!galleryId) {
												return;
											}
											openBulkEdit();
										}}
									>
										<Icon icon={drawerRight} size={18} />
										{__(
											'Bulk edit',
											'modula-best-grid-gallery'
										)}
									</Button>
								) : null}
								{editor.takeover ? (
									<PreviewCustomGridZoomControls
										galleryType={galleryType}
										previewViewport={previewViewport}
									/>
								) : null}
							</div>
						</div>

						<div
							className="modula-gallery-takeover__preview-chrome-center"
							aria-hidden={!(editor.takeover && pluploadBusy)}
						>
							{editor.takeover && pluploadBusy ? (
								<div
									className="modula-gallery-takeover__preview-chrome-uploading"
									role="status"
									aria-live="polite"
									aria-atomic="true"
								>
									<Spinner />
									<span>
										{__(
											'Uploading images…',
											'modula-best-grid-gallery'
										)}
									</span>
								</div>
							) : null}
						</div>

						<div className="modula-gallery-takeover__preview-chrome-actions">
							<PreviewAddNewSplit
								galleryId={galleryId}
								galleryType={galleryType}
								uploadPosition={uploadPosition}
								runPersistTask={persistItemMutation}
								onTakeoverOpenUpload={
									editor.takeover && galleryId
										? () =>
												imageImporterRef.current?.openFileDialog()
										: undefined
								}
								onLibraryAdded={() => {
									setMediaLibraryError('');
									invalidateBootstrap();
								}}
								onLibraryError={setMediaLibraryError}
								onOpenPreviewImport={openPreviewImport}
							/>
						</div>
					</div>
				</ExtensionImportHostProvider>
			)}
		</form.Subscribe>
	);
}
