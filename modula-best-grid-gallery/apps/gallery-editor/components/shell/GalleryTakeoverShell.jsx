/**
 * Redesign shell — rail + settings panel + optional auxiliary column (hover builder, etc.).
 *
 * Full takeover shell with live preview is preserved under `legacy/GalleryTakeoverShell.full.jsx`
 * (quarantine — delete the whole `legacy/` folder when no longer needed).
 */
import { useEffect, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { AuxiliaryPanel } from 'shared-ui';
import { SETTINGS_EDITOR_CATEGORIES } from '../../constants/editorStructure';
import { useModulaSettingsEditorConfig } from '../../hooks/useModulaSettingsEditorConfig';
import { getTakeoverStateFromLocationHash } from '../../logic/settingsEditorHash';
import { useTakeoverSaveStatus } from '../../context/TakeoverSaveStatusContext';
import { useTakeoverAuxiliaryPanel } from '../../context/TakeoverAuxiliaryPanelContext';
import { useTakeoverSidebarStack } from '../../context/TakeoverSidebarStackContext';
import { HoverEffectBuilderProvider } from '../../context/HoverEffectBuilderContext';
import { BulkEditProvider } from '../../context/BulkEditContext';
import { useTakeoverPostMeta } from '../../hooks/useTakeoverPostMeta';
import { useTakeoverSidebarStateSync } from '../../hooks/useTakeoverSidebarStateSync';
import { useTakeoverAuxiliarySync } from '../../hooks/useTakeoverAuxiliarySync';
import { useTakeoverRailDensity } from '../../hooks/useTakeoverRailDensity';
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
		initialSlug: config.postSlug || '',
		initialPermalinkPrefix: config.permalinkPrefix || '',
		initialPermalinkSuffix: config.permalinkSuffix || '',
		initialViewUrl: config.viewUrl || '',
		runPersistTask,
	});

	useEffect(() => {
		registerPostStatusSync(applyPostStatusFromServer);
		return () => registerPostStatusSync(null);
	}, [applyPostStatusFromServer, registerPostStatusSync]);

	const showAuxColumn = isAuxiliaryOpen;
	const workspaceRef = useRef(null);
	const railDensity = useTakeoverRailDensity({
		workspaceRef,
		isAuxiliaryOpen: showAuxColumn,
	});

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

	const previewWrapExtra =
		previewViewport === 'mobile'
			? ' modula-gallery-takeover__preview-wrap--mobile'
			: previewViewport === 'tablet'
				? ' modula-gallery-takeover__preview-wrap--tablet'
				: '';

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
				<div
					className={`modula-gallery-takeover__shell modula-gallery-takeover__shell--redesign-sidebar${
						showAuxColumn
							? ' modula-gallery-takeover__shell--aux-panel-open'
							: ''
					}`}
				>
					<TakeoverSettingsAutosave />
					<GalleryTakeoverTopBar
						galleryId={galleryId}
						postTitle={liveTitle}
						onPostTitleChange={setLiveTitle}
						onPostTitleCommit={commitPostTitle}
						adminUrl={adminUrl}
					/>
					<div
						className="modula-gallery-takeover__workspace"
						ref={workspaceRef}
					>
						<GallerySidebarRail
							activeCategory={activeCategory}
							setActiveCategory={setActiveCategory}
							docsUrl={docsUrl}
							railDensity={railDensity}
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
						{/*
						 * Canvas column: toolbar is secondary chrome under the app topbar
						 * (not inside the artboard). Stage below holds aux + previewer only.
						 */}
						<div className="modula-gallery-takeover__canvas-column">
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
											runPreviewItemMutation={
												runPersistTask
											}
										/>
										<GalleryPreviewSelectionBar
											galleryId={galleryId}
											onNavigateCategory={
												setActiveCategory
											}
											runPreviewItemMutation={
												runPersistTask
											}
										/>
									</>
								)}
							</form.Subscribe>
							<div className="modula-gallery-takeover__redesign-stage">
								{showAuxColumn ? (
									<AuxiliaryPanel
										aria-label={__(
											'Additional tools',
											'modula-best-grid-gallery'
										)}
									>
										<TakeoverAuxiliaryPanelHost
											galleryId={galleryId}
										/>
									</AuxiliaryPanel>
								) : null}
								<div className="modula-gallery-takeover__preview-column">
									<main
										id="modula-gallery-takeover-main"
										className="modula-gallery-takeover__main"
										tabIndex={-1}
										aria-labelledby="modula-takeover-topbar-title"
									>
										<div className="modula-gallery-takeover__preview-card">
											<div
												className={`modula-gallery-takeover__preview-wrap${previewWrapExtra}`}
											>
												<GalleryTakeoverLivePreviewLazy
													galleryId={galleryId}
													postTitle={liveTitle}
													previewViewport={
														previewViewport
													}
													activeCategory={
														activeCategory
													}
													hoverEffectBuilderActive={
														hoverEffectBuilderActive
													}
													lightboxPreviewActive={
														lightboxPreviewActive
													}
													filtersPreviewActive={
														filtersPreviewActive
													}
													paginationPreviewActive={
														paginationPreviewActive
													}
													showChrome={false}
												/>
											</div>
										</div>
									</main>
								</div>
							</div>
							<GalleryPreviewStatusBar
								previewViewport={previewViewport}
							/>
						</div>
					</div>
				</div>
				<BulkEditModalLazy />
			</HoverEffectBuilderProvider>
		</BulkEditProvider>
	);
}
