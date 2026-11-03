/**
 * Gallery editor takeover — gallery content for the shared takeover layout:
 * top bar, rail + settings panel, canvas toolbar, live preview, device pill.
 */
import { useEffect, useState } from '@wordpress/element';
import { useStore } from '@tanstack/react-form';
import { TakeoverLayout, useTakeoverSaveStatus } from 'editor-shell';
import { SETTINGS_EDITOR_CATEGORIES } from '../../constants/editorStructure';
import { useModulaSettingsEditorConfig } from '../../hooks/useModulaSettingsEditorConfig';
import { getTakeoverStateFromLocationHash } from '../../logic/settingsEditorHash';
import { useTakeoverAuxiliaryPanel } from '../../context/TakeoverAuxiliaryPanelContext';
import { useSettingsPanelSections } from '../../context/SettingsPanelSectionsContext';
import { HoverEffectBuilderProvider } from '../../context/HoverEffectBuilderContext';
import { BulkEditProvider } from '../../context/BulkEditContext';
import { useTakeoverPostMeta } from '../../hooks/useTakeoverPostMeta';
import { useTakeoverSidebarStateSync } from '../../hooks/useTakeoverSidebarStateSync';
import { useTakeoverAuxiliarySync } from '../../hooks/useTakeoverAuxiliarySync';
import { useGallerySettingsFormBundle } from '../../form/GallerySettingsFormContext';
import { resolveGalleryAdminPostId } from '../../utils/resolveGalleryAdminPostId';
import {
	getGalleryListUrl,
	getNewGalleryUrl,
} from '../../utils/galleryAdminUrls';
import { isPaginationSettingsPreviewActive } from '../../utils/isPaginationSettingsPreviewActive';
import GallerySidebarRail from '../sidebar/GallerySidebarRail';
import GalleryTakeoverLivePreviewLazy from '../preview/GalleryTakeoverLivePreviewLazy';
import GalleryPreviewCanvasToolbar from '../preview/GalleryPreviewCanvasToolbar';
import BulkEditModalLazy from '../bulk-edit/BulkEditModalLazy';
import AddMediaDialogLazy from '../add-media/AddMediaDialogLazy';
import GalleryTakeoverTopBar from './GalleryTakeoverTopBar';
import TakeoverSettingsAutosave from './TakeoverSettingsAutosave';
import TakeoverAuxiliaryPanelHost from './TakeoverAuxiliaryPanelHost';
import LicenseExpiredBanner from './LicenseExpiredBanner';

const initialTakeoverUi = getTakeoverStateFromLocationHash(
	SETTINGS_EDITOR_CATEGORIES
);

export default function GalleryTakeoverShell() {
	const config = useModulaSettingsEditorConfig();
	const galleryId = resolveGalleryAdminPostId(config);
	const { form, undoRedo } = useGallerySettingsFormBundle();
	const { runPersistTask, registerPostStatusSync } = useTakeoverSaveStatus();
	const { auxiliary, isAuxiliaryOpen, openFromCategory, closePanel } =
		useTakeoverAuxiliaryPanel();
	const { openSections } = useSettingsPanelSections();
	const [activeCategory, setActiveCategory] = useState(
		initialTakeoverUi.activeCategory
	);
	const [previewViewport, setPreviewViewport] = useState(
		/** @type {'desktop'|'tablet'|'mobile'} */ ('desktop')
	);
	const adminUrl = getGalleryListUrl(config);
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

	const hoverEffectBuilderActive =
		activeCategory === 'hover' ||
		auxiliary?.descriptor?.kind === 'hoverEffectBuilder';
	const lightboxPreviewActive = activeCategory === 'lightbox';
	const filtersPreviewActive = activeCategory === 'filters';
	const paginationPreviewActive = useStore(form.store, (state) =>
		isPaginationSettingsPreviewActive(
			activeCategory,
			openSections,
			state.values
		)
	);

	useTakeoverSidebarStateSync({
		categories: SETTINGS_EDITOR_CATEGORIES,
		activeCategory,
		setActiveCategory,
	});

	useTakeoverAuxiliarySync({
		categories: SETTINGS_EDITOR_CATEGORIES,
		activeCategory,
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
					onPreviewViewportChange={setPreviewViewport}
					topBar={
						<GalleryTakeoverTopBar
							galleryId={galleryId}
							postTitle={liveTitle}
							onPostTitleChange={setLiveTitle}
							onPostTitleCommit={commitPostTitle}
							adminUrl={adminUrl}
							newGalleryUrl={getNewGalleryUrl(config)}
							history={undoRedo}
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
										runPreviewItemMutation={runPersistTask}
									/>
									<LicenseExpiredBanner />
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
						/>
					}
				>
					<TakeoverSettingsAutosave />
				</TakeoverLayout>
				<BulkEditModalLazy />
				<AddMediaDialogLazy />
			</HoverEffectBuilderProvider>
		</BulkEditProvider>
	);
}
