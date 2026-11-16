/**
 * Gallery editor takeover — gallery content for the shared takeover layout:
 * top bar, rail + settings panel, canvas toolbar, live preview, device pill.
 */
import { useState } from '@wordpress/element';
import { useStore } from '@tanstack/react-form';
import { EditorRecoveryNotice, TakeoverLayout } from 'editor-shell';
import { SETTINGS_EDITOR_CATEGORIES } from '../../constants/editorStructure';
import { useModulaSettingsEditorConfig } from '../../hooks/useModulaSettingsEditorConfig';
import { getTakeoverStateFromLocationHash } from '../../logic/settingsEditorHash';
import { useTakeoverAuxiliaryPanel } from '../../context/TakeoverAuxiliaryPanelContext';
import { useSettingsPanelSections } from '../../context/SettingsPanelSectionsContext';
import { HoverEffectBuilderProvider } from '../../context/HoverEffectBuilderContext';
import { BulkEditProvider } from '../../context/BulkEditContext';
import { useGalleryPostFieldsPart } from '../../hooks/useGalleryPostFieldsPart';
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
import TakeoverAuxiliaryPanelHost from './TakeoverAuxiliaryPanelHost';
import LicenseExpiredBanner from './LicenseExpiredBanner';
import ProUpdateNotice from './ProUpdateNotice';
import { useGallerySettingsSavePart } from '../../form/useGallerySettingsSavePart';

const initialTakeoverUi = getTakeoverStateFromLocationHash(
	SETTINGS_EDITOR_CATEGORIES
);

/** Registers the gallery settings with the editor save session. */
function GallerySettingsSavePart() {
	useGallerySettingsSavePart(useGallerySettingsFormBundle());
	return null;
}

export default function GalleryTakeoverShell() {
	const config = useModulaSettingsEditorConfig();
	const galleryId = resolveGalleryAdminPostId(config);
	const { form, undoRedo } = useGallerySettingsFormBundle();
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
	const postFields = useGalleryPostFieldsPart(galleryId);

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
							postTitle={postFields.title}
							onPostTitleChange={postFields.setTitle}
							onPostTitleCommit={postFields.commitTitle}
							adminUrl={adminUrl}
							newGalleryUrl={getNewGalleryUrl(config)}
							history={undoRedo}
							documentStatus={postFields.status}
							documentStatusLabel={postFields.statusLabel}
							documentStatusChoices={
								config.postStatusChoices || []
							}
							onDocumentStatusChange={postFields.setStatus}
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
									/>
									<ProUpdateNotice />
									<LicenseExpiredBanner />
									<EditorRecoveryNotice />
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
							postTitle={postFields.title}
							previewViewport={previewViewport}
							activeCategory={activeCategory}
							hoverEffectBuilderActive={hoverEffectBuilderActive}
							lightboxPreviewActive={lightboxPreviewActive}
							filtersPreviewActive={filtersPreviewActive}
							paginationPreviewActive={paginationPreviewActive}
						/>
					}
				>
					<GallerySettingsSavePart />
				</TakeoverLayout>
				<BulkEditModalLazy />
				<AddMediaDialogLazy />
			</HoverEffectBuilderProvider>
		</BulkEditProvider>
	);
}
