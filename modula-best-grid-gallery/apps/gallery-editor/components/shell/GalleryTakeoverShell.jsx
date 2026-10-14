/**
 * Gallery editor takeover — gallery content for the shared takeover layout:
 * top bar, rail + settings panel, canvas toolbar, live preview, status bar.
 */
import { useEffect, useState } from '@wordpress/element';
import { TakeoverLayout, useTakeoverSaveStatus } from 'editor-shell';
import { SETTINGS_EDITOR_CATEGORIES } from '../../constants/editorStructure';
import { useModulaSettingsEditorConfig } from '../../hooks/useModulaSettingsEditorConfig';
import { getTakeoverStateFromLocationHash } from '../../logic/settingsEditorHash';
import { useTakeoverAuxiliaryPanel } from '../../context/TakeoverAuxiliaryPanelContext';
import { useTakeoverSidebarStack } from '../../context/TakeoverSidebarStackContext';
import { HoverEffectBuilderProvider } from '../../context/HoverEffectBuilderContext';
import { BulkEditProvider } from '../../context/BulkEditContext';
import { useTakeoverPostMeta } from '../../hooks/useTakeoverPostMeta';
import { useTakeoverSidebarStateSync } from '../../hooks/useTakeoverSidebarStateSync';
import { useTakeoverAuxiliarySync } from '../../hooks/useTakeoverAuxiliarySync';
import { useGallerySettingsFormBundle } from '../../form/GallerySettingsFormContext';
import { resolveGalleryAdminPostId } from '../../utils/resolveGalleryAdminPostId';
import { getGalleryListUrl } from '../../utils/galleryAdminUrls';
import { isPaginationSettingsPreviewActive } from '../../utils/isPaginationSettingsPreviewActive';
import GallerySidebarRail from '../sidebar/GallerySidebarRail';
import GalleryTakeoverLivePreviewLazy from '../preview/GalleryTakeoverLivePreviewLazy';
import GalleryPreviewCanvasToolbar from '../preview/GalleryPreviewCanvasToolbar';
import GalleryPreviewSelectionBar from '../preview/selection-bar/GalleryPreviewSelectionBar';
import GalleryPreviewStatusBar from '../preview/GalleryPreviewStatusBar';
import BulkEditModalLazy from '../bulk-edit/BulkEditModalLazy';
import GalleryTakeoverTopBar from './GalleryTakeoverTopBar';
import TakeoverSettingsAutosave from './TakeoverSettingsAutosave';
import TakeoverAuxiliaryPanelHost from './TakeoverAuxiliaryPanelHost';

const initialTakeoverUi = getTakeoverStateFromLocationHash(
	SETTINGS_EDITOR_CATEGORIES
);

export default function GalleryTakeoverShell() {
	const config = useModulaSettingsEditorConfig();
	const galleryId = resolveGalleryAdminPostId(config);
	const { form } = useGallerySettingsFormBundle();
	const { runPersistTask, registerPostStatusSync } = useTakeoverSaveStatus();
	const { auxiliary, isAuxiliaryOpen, openFromCategory, closePanel } =
		useTakeoverAuxiliaryPanel();
	const { stack } = useTakeoverSidebarStack();
	const [activeCategory, setActiveCategory] = useState(
		initialTakeoverUi.activeCategory
	);
	const [previewViewport, setPreviewViewport] = useState(
		/** @type {'desktop'|'tablet'|'mobile'} */ ('desktop')
	);
	const adminUrl = getGalleryListUrl(config);
	const docsUrl = config.modulaDocsBaseUrl || '';
	const {
		liveTitle,
		setLiveTitle,
		commitPostTitle,
		livePostStatus,
		livePostStatusLabel,
		handlePostStatusChange,
		statusBusy,
		applyPostStatusFromServer,
	} = useTakeoverPostMeta({
		galleryId,
		initialTitle: config.postTitle || '',
		initialStatus: config.postStatus || '',
		initialStatusLabel: config.postStatusLabel || '',
		runPersistTask,
	});

	useEffect(() => {
		registerPostStatusSync(applyPostStatusFromServer);
		return () => registerPostStatusSync(null);
	}, [applyPostStatusFromServer, registerPostStatusSync]);

	const topFrame = stack[stack.length - 1];
	const hoverEffectBuilderActive =
		activeCategory === 'hover' ||
		auxiliary?.descriptor?.kind === 'hoverEffectBuilder' ||
		topFrame?.auxiliaryPanel?.kind === 'hoverEffectBuilder';
	const lightboxPreviewActive = activeCategory === 'lightbox';
	const filtersPreviewActive = activeCategory === 'filters';
	const paginationPreviewActive = isPaginationSettingsPreviewActive(
		activeCategory,
		stack
	);

	useTakeoverSidebarStateSync({
		categories: SETTINGS_EDITOR_CATEGORIES,
		activeCategory,
		setActiveCategory,
	});

	useTakeoverAuxiliarySync({
		categories: SETTINGS_EDITOR_CATEGORIES,
		activeCategory,
		stack,
		auxiliary,
		openFromCategory,
		closePanel,
	});

	return (
		<BulkEditProvider>
			<HoverEffectBuilderProvider
				activeCategory={activeCategory}
				hoverEffectBuilderActive={hoverEffectBuilderActive}
			>
				<TakeoverLayout
					previewViewport={previewViewport}
					topBar={
						<GalleryTakeoverTopBar
							galleryId={galleryId}
							postTitle={liveTitle}
							onPostTitleChange={setLiveTitle}
							onPostTitleCommit={commitPostTitle}
							adminUrl={adminUrl}
							documentStatus={livePostStatus}
							documentStatusLabel={livePostStatusLabel}
							documentStatusChoices={
								config.postStatusChoices || []
							}
							onDocumentStatusChange={handlePostStatusChange}
							documentStatusBusy={statusBusy}
							canEditDocumentStatus={Boolean(
								config.canEditGalleryStatus
							)}
						/>
					}
					sidebar={
						<GallerySidebarRail
							activeCategory={activeCategory}
							setActiveCategory={setActiveCategory}
							docsUrl={docsUrl}
						/>
					}
					toolbar={
						<form.Subscribe
							selector={(s) =>
								typeof s.values?.general?.type === 'string'
									? s.values.general.type
									: ''
							}
						>
							{(galleryType) => (
								<>
									<GalleryPreviewCanvasToolbar
										galleryId={galleryId}
										galleryType={galleryType}
										previewViewport={previewViewport}
										onPreviewViewportChange={
											setPreviewViewport
										}
										runPreviewItemMutation={runPersistTask}
									/>
									<GalleryPreviewSelectionBar
										galleryId={galleryId}
										onNavigateCategory={setActiveCategory}
										runPreviewItemMutation={runPersistTask}
									/>
								</>
							)}
						</form.Subscribe>
					}
					auxiliary={
						isAuxiliaryOpen ? (
							<TakeoverAuxiliaryPanelHost galleryId={galleryId} />
						) : null
					}
					canvas={
						<GalleryTakeoverLivePreviewLazy
							galleryId={galleryId}
							postTitle={liveTitle}
							previewViewport={previewViewport}
							activeCategory={activeCategory}
							hoverEffectBuilderActive={hoverEffectBuilderActive}
							lightboxPreviewActive={lightboxPreviewActive}
							filtersPreviewActive={filtersPreviewActive}
							paginationPreviewActive={paginationPreviewActive}
							showChrome={false}
						/>
					}
					statusBar={
						<GalleryPreviewStatusBar
							previewViewport={previewViewport}
						/>
					}
				>
					<TakeoverSettingsAutosave />
				</TakeoverLayout>
				<BulkEditModalLazy />
			</HoverEffectBuilderProvider>
		</BulkEditProvider>
	);
}
