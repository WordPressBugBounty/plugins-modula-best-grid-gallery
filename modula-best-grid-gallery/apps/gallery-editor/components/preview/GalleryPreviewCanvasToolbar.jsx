/**
 * Redesign canvas toolbar above the live preview:
 * Select multiple | Select all | Bulk edit | Sort ··· viewport strip | Add images split (+ import host).
 */
import { useEffect, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import {
	CanvasToolbar,
	CanvasToolbarActionButton,
	useTakeoverSaveStatus,
} from 'editor-shell';
import { useGallerySettingsFormBundle } from '../../form/GallerySettingsFormContext';
import { useInvalidateGalleryBootstrap } from '../../hooks/useInvalidateGalleryBootstrap';
import { ExtensionImportHostProvider } from '../../platform/ExtensionImportHostContext';
import { useGalleryItemEditSidebar } from '../../context/GalleryItemEditSidebarContext';
import { useGalleryReorderSidebar } from '../../context/GalleryReorderSidebarContext';
import { useBulkEdit } from '../../context/BulkEditContext';
import { useGalleryPreviewTileSelection } from '../../context/GalleryPreviewTileSelectionContext';
import { getModulaSettingsEditorConfig } from '../../config/modulaSettingsEditorConfig';
import TakeoverImageUploader from './TakeoverImageUploader';
import PreviewAddNewSplit from './PreviewAddNewSplit';
import TakeoverPreviewImportModals from '../import-dialog/TakeoverPreviewImportModals';
import { useTakeoverPreviewImportFlows } from '../../hooks/useTakeoverPreviewImportFlows';
import {
	canvasToolbarBulkEditIcon,
	canvasToolbarSelectAllIcon,
	canvasToolbarSelectMultipleIcon,
	canvasToolbarSortIcon,
} from './canvasToolbarIcons';

/**
 * @param {{
 *   galleryId?: number,
 *   galleryType?: string,
 *   previewViewport?: 'desktop'|'tablet'|'mobile',
 *   onPreviewViewportChange?: (v: 'desktop'|'tablet'|'mobile') => void,
 *   runPreviewItemMutation?: (task: () => void | Promise<void>) => Promise<void>,
 * }} props
 */
export default function GalleryPreviewCanvasToolbar({
	galleryId = 0,
	galleryType = '',
	previewViewport = 'desktop',
	onPreviewViewportChange,
	runPreviewItemMutation,
}) {
	const { form } = useGallerySettingsFormBundle();
	const { runPersistTask } = useTakeoverSaveStatus();
	const persistItemMutation = runPreviewItemMutation ?? runPersistTask;
	const reorderSidebar = useGalleryReorderSidebar();
	const itemEdit = useGalleryItemEditSidebar();
	const { openBulkEdit } = useBulkEdit();
	const tileSelection = useGalleryPreviewTileSelection();
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
					<CanvasToolbar
						previewViewport={previewViewport}
						onPreviewViewportChange={onPreviewViewportChange}
						errorNotice={mediaLibraryError}
						onDismissErrorNotice={() => setMediaLibraryError('')}
						busyMessage={
							editor.takeover && pluploadBusy
								? __(
										'Uploading images…',
										'modula-best-grid-gallery'
									)
								: ''
						}
						actions={
							<>
								{editor.isPro ? (
									<CanvasToolbarActionButton
										icon={canvasToolbarSelectMultipleIcon}
										disabled={!galleryId}
										aria-pressed={Boolean(
											tileSelection?.modeActive
										)}
										onClick={() => {
											if (!galleryId) {
												return;
											}
											tileSelection?.toggleMode?.();
										}}
									>
										{tileSelection?.modeActive
											? __(
													'Done selecting',
													'modula-best-grid-gallery'
												)
											: __(
													'Select multiple',
													'modula-best-grid-gallery'
												)}
									</CanvasToolbarActionButton>
								) : null}
								{editor.isPro && tileSelection?.modeActive ? (
									<CanvasToolbarActionButton
										icon={canvasToolbarSelectAllIcon}
										disabled={!galleryId}
										aria-pressed={Boolean(
											tileSelection?.allSelected
										)}
										onClick={() => {
											if (!galleryId) {
												return;
											}
											tileSelection?.toggleSelectAll?.();
										}}
									>
										{tileSelection?.allSelected
											? __(
													'Deselect all',
													'modula-best-grid-gallery'
												)
											: __(
													'Select all',
													'modula-best-grid-gallery'
												)}
									</CanvasToolbarActionButton>
								) : null}
								{editor.isPro ? (
									<CanvasToolbarActionButton
										icon={canvasToolbarBulkEditIcon}
										disabled={!galleryId}
										onClick={() => {
											if (!galleryId) {
												return;
											}
											openBulkEdit();
										}}
									>
										{__(
											'Bulk edit',
											'modula-best-grid-gallery'
										)}
									</CanvasToolbarActionButton>
								) : null}
								{editor.isPro ? (
									<CanvasToolbarActionButton
										icon={canvasToolbarSortIcon}
										disabled={!galleryId}
										onClick={() => {
											if (!galleryId) {
												return;
											}
											itemEdit?.close();
											reorderSidebar?.open();
										}}
									>
										{__('Sort', 'modula-best-grid-gallery')}
									</CanvasToolbarActionButton>
								) : null}
							</>
						}
						addSplit={
							<PreviewAddNewSplit
								mainLabel={__(
									'Add images',
									'modula-best-grid-gallery'
								)}
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
						}
					>
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
					</CanvasToolbar>
				</ExtensionImportHostProvider>
			)}
		</form.Subscribe>
	);
}
