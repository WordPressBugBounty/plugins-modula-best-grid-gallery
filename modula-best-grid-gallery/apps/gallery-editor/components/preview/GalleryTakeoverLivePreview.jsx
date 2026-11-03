/**
 * Live gallery preview: items from React Query bootstrap; settings from TanStack Form (reactive).
 */
import {
	CanvasFiltersPreviewBar,
	EAGER_LAYOUTS,
	FILTERS_PREVIEW_BAR_CLASS,
	Gallery,
	GalleryPreviewAdminActionsContext,
	GalleryPreviewEagerLayoutsContext,
	GalleryPreviewFilterBarContext,
	GalleryPreviewHoverTileContext,
	buildFilteringFromSettings,
	isEmbeddedGalleryItemRow,
	resolveGalleryHoverBuilder,
} from 'gallery-shared/preview';
import FreeformEditorLayout from './FreeformEditorLayout';
import { WatermarkPreviewProvider } from './WatermarkPreviewProvider';
import { useEffect, useMemo, useRef, useState } from '@wordpress/element';
import '../../styles/takeover/preview/_hover-effect-builder.scss';
import { __, sprintf } from '@wordpress/i18n';
import { Notice, Spinner } from 'admin-ui';
import { AdminUiScope } from 'editor-shell';
import { Provider } from 'react-redux';
import { useGallerySettingsFormBundle } from '../../form/GallerySettingsFormContext';
import { useGalleryBootstrapQuery } from '../../query/useGalleryBootstrapQuery';
import { useWatermarkPreviewSelection } from '../../context/WatermarkPreviewSelectionContext';
import { useGalleryPreviewTileSelection } from '../../context/GalleryPreviewTileSelectionContext';
import GalleryTakeoverPreviewEmptyState from './GalleryTakeoverPreviewEmptyState';
import GallerySelectionGrid from './selection-grid/GallerySelectionGrid';
import { galleryHasPreviewContent } from './galleryPreviewContent';
import { useGalleryTakeoverLivePreviewController } from '../../hooks/useGalleryTakeoverLivePreviewController';
import { PreviewItemPersistProvider } from '../../context/PreviewItemPersistContext';
import HoverEffectBuilderCard from '../hover-effect-builder/HoverEffectBuilderCard';
import { buildPreviewHoverTile } from 'gallery-shared/hover/hoverTile';
import { editorCaptionsAreBelowImage } from '../../utils/editorCaptionsAreBelowImage';
import HoverBuilderBelowImageNotice from '../hover-effect-builder/HoverBuilderBelowImageNotice';
import LightboxPreviewPanelLazy from '../lightbox-preview/LightboxPreviewPanelLazy';
import FiltersPreviewPanel from './filters-preview/FiltersPreviewPanel';
import { normalizeLightboxClickMode } from '../lightbox-preview/SimpleLinkLightboxPreviewNotice';
import { usePaginationRegistration } from '../../hooks/usePaginationRegistration';
import { captionToPlainString } from '../../utils/captionToPlainString';
import { setGalleryPreviewAdminActions } from '../../utils/previewAdminActionsRef';
import { notifyPreviewAdminActionsListeners } from '../../hooks/useGalleryPreviewAdminActionsOptional';
import { useGalleryItemEditSidebar } from '../../context/GalleryItemEditSidebarContext';

/**
 * Clicks on these keep the tile selection: tiles, their chrome, the static
 * filter bar and any control.
 */
const KEEPS_ITEM_SELECTION = [
	'.modula-gallery-preview-item-admin',
	'.modula-tile-toolbar',
	'.modula-freeform-selection',
	'[data-modula-freeform-item]',
	`.${FILTERS_PREVIEW_BAR_CLASS}`,
	'button',
	'a',
	'input',
	'select',
	'textarea',
	'label',
].join(', ');

const EDITOR_LAYOUTS = { ...EAGER_LAYOUTS, freeform: FreeformEditorLayout };

/**
 * @param {{
 *   galleryId: number,
 *   previewViewport?: 'desktop'|'tablet'|'mobile',
 *   activeCategory?: string,
 *   hoverEffectBuilderActive?: boolean,
 *   lightboxPreviewActive?: boolean,
 *   filtersPreviewActive?: boolean,
 *   paginationPreviewActive?: boolean,
 *   postTitle?: string,
 * }} props
 */
export default function GalleryTakeoverLivePreview({
	galleryId,
	previewViewport = 'desktop',
	activeCategory = '',
	hoverEffectBuilderActive = false,
	lightboxPreviewActive = false,
	filtersPreviewActive = false,
	paginationPreviewActive = false,
	postTitle = '',
}) {
	const {
		data: bootstrap,
		isPending,
		isError,
		error,
	} = useGalleryBootstrapQuery(galleryId);
	const { form } = useGallerySettingsFormBundle();

	if (!galleryId) {
		return (
			<div className="modula-gallery-takeover__preview-error">
				<AdminUiScope>
					<Notice>
						{__(
							'Save the gallery first to load the preview.',
							'modula-best-grid-gallery'
						)}
					</Notice>
				</AdminUiScope>
			</div>
		);
	}

	if (isPending) {
		return (
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
		);
	}

	if (isError) {
		const msg =
			error?.message ||
			error?.data?.message ||
			__('Could not load gallery preview.', 'modula-best-grid-gallery');
		return (
			<div className="modula-gallery-takeover__preview-error">
				<AdminUiScope>
					<Notice tone="error" role="alert">
						{msg}
					</Notice>
				</AdminUiScope>
			</div>
		);
	}

	return (
		<form.Subscribe selector={(s) => s.values}>
			{(groupedSettings) => (
				<GalleryTakeoverLivePreviewMounted
					galleryId={galleryId}
					bootstrap={bootstrap}
					groupedSettings={groupedSettings}
					previewViewport={previewViewport}
					activeCategory={activeCategory}
					hoverEffectBuilderActive={hoverEffectBuilderActive}
					lightboxPreviewActive={lightboxPreviewActive}
					filtersPreviewActive={filtersPreviewActive}
					paginationPreviewActive={paginationPreviewActive}
					postTitle={postTitle}
				/>
			)}
		</form.Subscribe>
	);
}

/**
 * @param {{
 *   galleryId: number,
 *   bootstrap: object,
 *   groupedSettings: object,
 *   previewViewport: 'desktop'|'tablet'|'mobile',
 *   activeCategory: string,
 *   hoverEffectBuilderActive: boolean,
 *   lightboxPreviewActive: boolean,
 *   filtersPreviewActive: boolean,
 *   paginationPreviewActive: boolean,
 *   postTitle: string,
 * }} props
 */
function GalleryTakeoverLivePreviewMounted({
	galleryId,
	bootstrap,
	groupedSettings,
	previewViewport,
	activeCategory,
	hoverEffectBuilderActive,
	lightboxPreviewActive,
	filtersPreviewActive,
	paginationPreviewActive,
	postTitle,
}) {
	const previewBodyRef = useRef(/** @type {HTMLDivElement|null} */ (null));
	const [artboardInnerWidth, setArtboardInnerWidth] = useState(0);

	useEffect(() => {
		const el = previewBodyRef.current;
		if (!el || typeof ResizeObserver === 'undefined') {
			return undefined;
		}
		const update = () => {
			const style = window.getComputedStyle(el);
			const padX =
				(parseFloat(style.paddingLeft) || 0) +
				(parseFloat(style.paddingRight) || 0);
			const inner = Math.max(0, el.clientWidth - padX);
			setArtboardInnerWidth(inner);
		};
		update();
		const ro = new ResizeObserver(update);
		ro.observe(el);
		return () => ro.disconnect();
	}, []);

	const paginationRegistration = usePaginationRegistration();
	const PaginationPreviewPanel = paginationRegistration?.PreviewPanel;
	const {
		store,
		galleryType,
		previewGalleryShellStyle,
		galleryWidthOverflow,
		previewItemPersistApi,
		previewAdminValue,
	} = useGalleryTakeoverLivePreviewController({
		galleryId,
		bootstrap,
		groupedSettings,
		previewViewport,
		galleryTitle: postTitle,
		artboardInnerWidth,
	});

	const itemEdit = useGalleryItemEditSidebar();
	const hasSelectedItem = Number.isInteger(itemEdit?.selectedIndex);
	const clearItemSelection = itemEdit?.close;
	// A click on the empty canvas deselects (Escape is the keyboard way).
	useEffect(() => {
		const body = previewBodyRef.current;
		if (!body || !hasSelectedItem || !clearItemSelection) {
			return undefined;
		}
		const onClick = (event) => {
			if (
				event.target instanceof Element &&
				!event.target.closest(KEEPS_ITEM_SELECTION)
			) {
				clearItemSelection();
			}
		};
		body.addEventListener('click', onClick);
		return () => body.removeEventListener('click', onClick);
	}, [hasSelectedItem, clearItemSelection]);

	const watermarkSelection = useWatermarkPreviewSelection();
	const tileSelection = useGalleryPreviewTileSelection();
	const isSelectingTiles = Boolean(tileSelection?.modeActive);
	// The bootstrap rows carry the saved hover classes; the tiles take these
	// live ones so the preview hover follows every edit, and plays what the
	// Motion hover choice plays, as the visitor items do.
	const hoverSettings = groupedSettings?.hover;
	const motionSettings = groupedSettings?.motion;
	const captionSettings = groupedSettings?.captions;
	const galleryTypeSetting = groupedSettings?.general?.type;
	const hoverTile = useMemo(
		() =>
			buildPreviewHoverTile({
				builder: resolveGalleryHoverBuilder({
					hover: hoverSettings,
					motion: motionSettings,
					general: { type: galleryTypeSetting },
				}),
				hover: hoverSettings,
				captionBelowImage: editorCaptionsAreBelowImage(
					captionSettings,
					galleryTypeSetting
				),
			}),
		[hoverSettings, motionSettings, captionSettings, galleryTypeSetting]
	);
	const previewAdminValueWithExtras = useMemo(() => {
		if (!previewAdminValue) {
			return previewAdminValue;
		}
		let next = { ...previewAdminValue, previewViewport };
		if (watermarkSelection) {
			next = {
				...next,
				watermarkSelectionActive: watermarkSelection.active,
				isWatermarkSelected: watermarkSelection.isSelected,
				toggleWatermarkSelection: watermarkSelection.toggle,
			};
		}
		return next;
	}, [previewAdminValue, watermarkSelection, previewViewport]);

	useEffect(() => {
		setGalleryPreviewAdminActions(previewAdminValueWithExtras || null);
		notifyPreviewAdminActionsListeners();
		return () => {
			setGalleryPreviewAdminActions(null);
			notifyPreviewAdminActionsListeners();
		};
	}, [previewAdminValueWithExtras]);

	const isHoverBuilderPreview =
		hoverEffectBuilderActive || activeCategory === 'hover';
	const isLightboxPreview = lightboxPreviewActive;
	// Without filter names there is no bar to preview: the Filters tab keeps
	// the gallery on the artboard, as the canvas does.
	const isFiltersPreview =
		filtersPreviewActive &&
		buildFilteringFromSettings(groupedSettings).availableFilters.length > 0;
	const isPaginationPreview = paginationPreviewActive;
	const lightboxClickMode = normalizeLightboxClickMode(
		groupedSettings?.lightbox?.lightbox
	);
	const useFancyboxLightboxPreview =
		isLightboxPreview &&
		(lightboxClickMode === 'fancybox' ||
			lightboxClickMode === 'lightbox-prefer-url');
	const hasPreviewContent = galleryHasPreviewContent(
		bootstrap?.items,
		galleryType
	);
	const hoverSampleRow = pickFirstGalleryRowForHoverPreview(bootstrap?.items);

	return (
		<div className="modula-gallery-takeover__live-preview modula modula-gallery modula-gallery-modern modula-gallery-initialized modula-gallery-chrome-ready">
			<GalleryPreviewAdminActionsContext.Provider
				value={previewAdminValueWithExtras}
			>
				<div
					ref={previewBodyRef}
					className={`modula-gallery-takeover__live-preview-body${
						isHoverBuilderPreview
							? ' modula-gallery-takeover__live-preview-body--hover-builder'
							: ''
					}${
						useFancyboxLightboxPreview
							? ' modula-gallery-takeover__live-preview-body--lightbox-preview'
							: ''
					}${
						isFiltersPreview
							? ' modula-gallery-takeover__live-preview-body--filters-preview'
							: ''
					}${
						isPaginationPreview
							? ' modula-gallery-takeover__live-preview-body--pagination-preview'
							: ''
					}${
						galleryWidthOverflow
							? ' modula-gallery-takeover__live-preview-body--width-overflow'
							: ''
					}`}
				>
					{isSelectingTiles && hasPreviewContent ? (
						<GallerySelectionGrid />
					) : isHoverBuilderPreview ? (
						<>
							<HoverBuilderBelowImageNotice
								captions={groupedSettings?.captions}
								galleryType={groupedSettings?.general?.type}
							/>
							<div className="modula modula-gallery-takeover__hover-builder-preview">
								<div className="modula-items">
									<HoverEffectBuilderCard
										sampleImageSrc={hoverSampleRow.src}
										sampleImageAlt={hoverSampleRow.alt}
										previewItemTitle={hoverSampleRow.title}
										previewItemDescription={
											hoverSampleRow.description
										}
									/>
								</div>
							</div>
						</>
					) : useFancyboxLightboxPreview ? (
						<LightboxPreviewPanelLazy
							items={bootstrap?.items}
							groupedSettings={groupedSettings}
							galleryId={galleryId}
							previewViewport={previewViewport}
						/>
					) : isFiltersPreview ? (
						<FiltersPreviewPanel
							galleryId={galleryId}
							groupedSettings={groupedSettings}
							previewViewport={previewViewport}
						/>
					) : isPaginationPreview && PaginationPreviewPanel ? (
						<PaginationPreviewPanel
							galleryId={galleryId}
							groupedSettings={groupedSettings}
							previewViewport={previewViewport}
						/>
					) : !hasPreviewContent ? (
						<GalleryTakeoverPreviewEmptyState
							galleryType={galleryType}
						/>
					) : (
						<>
							{galleryWidthOverflow ? (
								<AdminUiScope>
									<Notice
										className="modula-gallery-takeover__live-preview-width-overflow-notice"
										role="status"
									>
										{sprintf(
											/* translators: 1: gallery width in px, 2: preview frame width in px */
											__(
												'This gallery is set to %1$spx wide, but the preview frame is only %2$spx. Scroll horizontally to see the full layout. On the site, the gallery still uses your set width (%1$spx), not this frame.',
												'modula-best-grid-gallery'
											),
											String(
												galleryWidthOverflow.galleryPx
											),
											String(
												galleryWidthOverflow.artboardPx
											)
										)}
									</Notice>
								</AdminUiScope>
							) : null}
							<div
								className={`modula-gallery-takeover__live-preview-gallery-scroll${
									galleryWidthOverflow
										? ' modula-gallery-takeover__live-preview-gallery-scroll--width-overflow'
										: ''
								}`}
							>
								<PreviewItemPersistProvider
									value={previewItemPersistApi}
								>
									<Provider store={store}>
										<GalleryPreviewEagerLayoutsContext.Provider
											value={EDITOR_LAYOUTS}
										>
											<div
												id={`modula-${galleryId}`}
												className="modula modula-gallery-takeover__live-preview-gallery-shell"
												style={previewGalleryShellStyle}
											>
												<GalleryPreviewHoverTileContext.Provider
													value={hoverTile}
												>
													<GalleryPreviewFilterBarContext.Provider
														value={
															CanvasFiltersPreviewBar
														}
													>
														<WatermarkPreviewProvider
															watermarkSettings={
																groupedSettings?.watermark
															}
														>
															<Gallery />
														</WatermarkPreviewProvider>
													</GalleryPreviewFilterBarContext.Provider>
												</GalleryPreviewHoverTileContext.Provider>
											</div>
										</GalleryPreviewEagerLayoutsContext.Provider>
									</Provider>
								</PreviewItemPersistProvider>
							</div>
						</>
					)}
				</div>
			</GalleryPreviewAdminActionsContext.Provider>
		</div>
	);
}

/**
 * First non-embedded image row for the Hover builder preview tile (same row as image metadata).
 *
 * @param {unknown[]} items Bootstrap gallery rows.
 * @return {{ src: string, alt: string, title: string, description: string }}
 */
function pickFirstGalleryRowForHoverPreview(items) {
	const empty = { src: '', alt: '', title: '', description: '' };
	if (!Array.isArray(items)) {
		return empty;
	}
	for (const row of items) {
		if (!row || typeof row !== 'object') {
			continue;
		}
		if (isEmbeddedGalleryItemRow(row)) {
			continue;
		}
		const src =
			(typeof row.src === 'string' && row.src) ||
			(typeof row.thumbnail === 'string' && row.thumbnail) ||
			(typeof row.url === 'string' && row.url) ||
			'';
		if (src) {
			let alt = '';
			if (typeof row.alt === 'string') {
				alt = row.alt;
			} else if (typeof row.title === 'string') {
				alt = row.title;
			}
			const title = captionToPlainString(row.title).trim();
			const description = (
				captionToPlainString(row.description) ||
				captionToPlainString(row.caption)
			).trim();
			return {
				src,
				alt: alt || title,
				title,
				description,
			};
		}
	}
	return empty;
}
