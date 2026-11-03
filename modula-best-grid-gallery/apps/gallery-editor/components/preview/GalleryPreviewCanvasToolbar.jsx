/**
 * Redesign canvas toolbar above the live preview:
 * Select multiple | Bulk edit | Sort · <mode> ⌄ ··· Add split (+ import host).
 * In selection mode: Done selecting | Select all | N selected · Clear | Bulk edit (N) | Sort.
 * Sort opens its popover (GallerySortPopover).
 */
import { useEffect, useState } from '@wordpress/element';
import { __, _n, sprintf } from '@wordpress/i18n';
import {
	CanvasToolbar,
	CanvasToolbarActionButton,
	CanvasToolbarSelectionCount,
	useTakeoverSaveStatus,
} from 'editor-shell';
import { useGallerySettingsFormBundle } from '../../form/GallerySettingsFormContext';
import { useInvalidateGalleryBootstrap } from '../../hooks/useInvalidateGalleryBootstrap';
import { ExtensionImportHostProvider } from '../../platform/ExtensionImportHostContext';
import { useBulkEdit } from '../../context/BulkEditContext';
import { useGalleryPreviewTileSelection } from '../../context/GalleryPreviewTileSelectionContext';
import { getModulaSettingsEditorConfig } from '../../config/modulaSettingsEditorConfig';
import PreviewAddNewSplit from './PreviewAddNewSplit';
import TakeoverPreviewImportModals from '../import-dialog/TakeoverPreviewImportModals';
import { useTakeoverPreviewImportFlows } from '../../hooks/useTakeoverPreviewImportFlows';
import {
	canvasToolbarBulkEditIcon,
	canvasToolbarSelectAllIcon,
	canvasToolbarSelectMultipleIcon,
} from './canvasToolbarIcons';
import GallerySortPopover from './GallerySortPopover';

/**
 * @param {{
 *   galleryId?: number,
 *   galleryType?: string,
 *   runPreviewItemMutation?: (task: () => void | Promise<void>) => Promise<void>,
 * }} props
 */
export default function GalleryPreviewCanvasToolbar({
	galleryId = 0,
	galleryType = '',
	runPreviewItemMutation,
}) {
	const { form } = useGallerySettingsFormBundle();
	const { runPersistTask } = useTakeoverSaveStatus();
	const persistItemMutation = runPreviewItemMutation ?? runPersistTask;
	const { openBulkEdit } = useBulkEdit();
	const tileSelection = useGalleryPreviewTileSelection();
	const selectedCount = tileSelection?.modeActive
		? tileSelection.selectedStoreIndices.length
		: 0;
	const editor = getModulaSettingsEditorConfig();
	const [mediaLibraryError, setMediaLibraryError] = useState('');

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
						errorNotice={mediaLibraryError}
						onDismissErrorNotice={() => setMediaLibraryError('')}
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
								{editor.isPro && selectedCount > 0 ? (
									<CanvasToolbarSelectionCount
										label={sprintf(
											/* translators: %d: number of selected images */
											_n(
												'%d image selected',
												'%d images selected',
												selectedCount,
												'modula-best-grid-gallery'
											),
											selectedCount
										)}
										onClear={tileSelection.clear}
									/>
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
										{selectedCount > 0
											? sprintf(
													/* translators: %d: number of selected images */
													__(
														'Bulk edit (%d)',
														'modula-best-grid-gallery'
													),
													selectedCount
												)
											: __(
													'Bulk edit',
													'modula-best-grid-gallery'
												)}
									</CanvasToolbarActionButton>
								) : null}
								{editor.isPro ? (
									<GallerySortPopover galleryId={galleryId} />
								) : null}
							</>
						}
						addSplit={
							<PreviewAddNewSplit
								mainLabel={__(
									'Add',
									'modula-best-grid-gallery'
								)}
								galleryId={galleryId}
								galleryType={galleryType}
								uploadPosition={uploadPosition}
								runPersistTask={persistItemMutation}
								onLibraryAdded={() => {
									setMediaLibraryError('');
									invalidateBootstrap();
								}}
								onLibraryError={setMediaLibraryError}
								onOpenPreviewImport={openPreviewImport}
							/>
						}
					>
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
