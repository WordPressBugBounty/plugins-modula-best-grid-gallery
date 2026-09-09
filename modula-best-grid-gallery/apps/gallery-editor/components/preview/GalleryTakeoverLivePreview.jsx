/**
 * Live gallery preview: items from React Query bootstrap; settings from TanStack Form (reactive).
 */
import {
	EAGER_LAYOUTS,
	Gallery,
	GalleryPreviewAdminActionsContext,
	GalleryPreviewEagerLayoutsContext,
	isEmbeddedGalleryItemRow,
	isVideoGalleryItem,
} from 'gallery-shared/preview';
import { useEffect, useMemo, useRef, useState } from '@wordpress/element';
import '../../styles/takeover/preview/_hover-effect-builder.scss';
import { __, sprintf } from '@wordpress/i18n';
import { Notice, Spinner } from '@wordpress/components';
import { Provider } from 'react-redux';
import { useGallerySettingsFormBundle } from '../../form/GallerySettingsFormContext';
import { useGalleryBootstrapQuery } from '../../query/useGalleryBootstrapQuery';
import { useWatermarkPreviewSelection } from '../../context/WatermarkPreviewSelectionContext';
import { useGalleryPreviewTileSelection } from '../../context/GalleryPreviewTileSelectionContext';
import GalleryTakeoverPreviewChrome from './GalleryTakeoverPreviewChrome';
import GalleryTakeoverPreviewEmptyState from './GalleryTakeoverPreviewEmptyState';
import GalleryTakeoverPreviewUploadDropZone from './GalleryTakeoverPreviewUploadDropZone';
import { useGalleryTakeoverLivePreviewController } from '../../hooks/useGalleryTakeoverLivePreviewController';
import { PreviewItemPersistProvider } from '../../context/PreviewItemPersistContext';
import HoverEffectBuilderCard from '../hover-effect-builder/HoverEffectBuilderCard';
import HoverBuilderBelowImageNotice from '../hover-effect-builder/HoverBuilderBelowImageNotice';
import LightboxPreviewPanelLazy from '../lightbox-preview/LightboxPreviewPanelLazy';
import FiltersPreviewPanel from './filters-preview/FiltersPreviewPanel';
import { normalizeLightboxClickMode } from '../lightbox-preview/SimpleLinkLightboxPreviewNotice';
import { usePaginationRegistration } from '../../hooks/usePaginationRegistration';
import { captionToPlainString } from '../../utils/captionToPlainString';
import { setGalleryPreviewAdminActions } from '../../utils/previewAdminActionsRef';
import { notifyPreviewAdminActionsListeners } from '../../hooks/useGalleryPreviewAdminActionsOptional';

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
 *   showChrome?: boolean,
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
	showChrome = true,
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
				<Notice status="warning" isDismissible={false}>
					{__(
						'Save the gallery first to load the preview.',
						'modula-best-grid-gallery'
					)}
				</Notice>
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
				<Spinner />
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
				<Notice status="error" isDismissible={false}>
					{msg}
				</Notice>
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
					showChrome={showChrome}
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
 *   showChrome: boolean,
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
	showChrome,
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
		dropZoneError,
		dismissDropZoneError,
		startZoneDisplay,
		endZoneDisplay,
		dropZoneInteractive,
		handleDropZoneFiles,
		runPreviewItemMutation,
	} = useGalleryTakeoverLivePreviewController({
		galleryId,
		bootstrap,
		groupedSettings,
		previewViewport,
		galleryTitle: postTitle,
		artboardInnerWidth,
	});

	const watermarkSelection = useWatermarkPreviewSelection();
	const tileSelection = useGalleryPreviewTileSelection();
	const previewAdminValueWithExtras = useMemo(() => {
		if (!previewAdminValue) {
			return previewAdminValue;
		}
		let next = previewAdminValue;
		if (watermarkSelection) {
			next = {
				...next,
				watermarkSelectionActive: watermarkSelection.active,
				isWatermarkSelected: watermarkSelection.isSelected,
				toggleWatermarkSelection: watermarkSelection.toggle,
			};
		}
		if (tileSelection) {
			next = {
				...next,
				tileSelectionActive: tileSelection.modeActive,
				isTileSelected: tileSelection.isSelected,
				handleTileSelectionClick: (storeIndex, event) => {
					const shiftKey = Boolean(event?.shiftKey);
					tileSelection.handleTileClick(storeIndex, {
						shiftKey,
						anchorOverride:
							shiftKey && !tileSelection.modeActive
								? (previewAdminValue?.selectedEditStoreIndex ??
									null)
								: undefined,
					});
				},
			};
		}
		return next;
	}, [previewAdminValue, watermarkSelection, tileSelection]);

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
	const isFiltersPreview = filtersPreviewActive;
	const isPaginationPreview = paginationPreviewActive;
	const lightboxClickMode = normalizeLightboxClickMode(
		groupedSettings?.lightbox?.lightbox
	);
	const useFancyboxLightboxPreview =
		isLightboxPreview && lightboxClickMode === 'fancybox';
	const isVideoGallery = galleryType === 'video';
	const hasGalleryImages = hasGalleryPreviewImageRows(bootstrap?.items);
	const hasGalleryVideos = hasGalleryPreviewVideoRows(bootstrap?.items);
	const hasPreviewContent = isVideoGallery
		? hasGalleryVideos
		: hasGalleryImages;
	const hoverSampleRow = pickFirstGalleryRowForHoverPreview(bootstrap?.items);

	return (
		<div className="modula-gallery-takeover__live-preview modula modula-gallery modula-gallery-modern modula-gallery-initialized modula-gallery-chrome-ready">
			{showChrome ? (
				<GalleryTakeoverPreviewChrome
					galleryType={galleryType}
					galleryId={galleryId}
					previewViewport={previewViewport}
					runPreviewItemMutation={runPreviewItemMutation}
				/>
			) : null}
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
					{dropZoneError ? (
						<Notice
							className="modula-gallery-takeover__live-preview-dropzone-notice"
							status="error"
							isDismissible
							onRemove={dismissDropZoneError}
						>
							{dropZoneError}
						</Notice>
					) : null}
					{isHoverBuilderPreview ? (
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
							status={startZoneDisplay.status}
							uploadCurrent={startZoneDisplay.current}
							uploadTotal={startZoneDisplay.total}
							interactive={dropZoneInteractive}
							onFilesSelected={(files) =>
								void handleDropZoneFiles('start', files)
							}
						/>
					) : (
						<>
							{showChrome ? (
								<GalleryTakeoverPreviewUploadDropZone
									placement="start"
									status={startZoneDisplay.status}
									uploadCurrent={startZoneDisplay.current}
									uploadTotal={startZoneDisplay.total}
									interactive={dropZoneInteractive}
									onFilesSelected={(files) =>
										void handleDropZoneFiles('start', files)
									}
								/>
							) : null}
							{galleryWidthOverflow ? (
								<Notice
									className="modula-gallery-takeover__live-preview-width-overflow-notice"
									status="warning"
									isDismissible={false}
								>
									{sprintf(
										/* translators: 1: gallery width in px, 2: preview frame width in px */
										__(
											'This gallery is set to %1$spx wide, but the preview frame is only %2$spx. Scroll horizontally to see the full layout. On the site, the gallery still uses your set width (%1$spx), not this frame.',
											'modula-best-grid-gallery'
										),
										String(galleryWidthOverflow.galleryPx),
										String(galleryWidthOverflow.artboardPx)
									)}
								</Notice>
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
											value={EAGER_LAYOUTS}
										>
											<div
												id={`modula-${galleryId}`}
												className="modula modula-gallery-takeover__live-preview-gallery-shell"
												style={previewGalleryShellStyle}
											>
												<Gallery />
											</div>
										</GalleryPreviewEagerLayoutsContext.Provider>
									</Provider>
								</PreviewItemPersistProvider>
							</div>
							{showChrome ? (
								<GalleryTakeoverPreviewUploadDropZone
									placement="end"
									status={endZoneDisplay.status}
									uploadCurrent={endZoneDisplay.current}
									uploadTotal={endZoneDisplay.total}
									interactive={dropZoneInteractive}
									onFilesSelected={(files) =>
										void handleDropZoneFiles('end', files)
									}
								/>
							) : null}
						</>
					)}
				</div>
			</GalleryPreviewAdminActionsContext.Provider>
		</div>
	);
}

/**
 * Whether bootstrap rows contain at least one video entry (URL or template row).
 *
 * @param {unknown[]} items
 * @returns {boolean}
 */
function hasGalleryPreviewVideoRows(items) {
	if (!Array.isArray(items)) {
		return false;
	}
	return items.some((row) => isVideoGalleryItem(row));
}

/**
 * Whether bootstrap rows currently contain at least one real image entry.
 *
 * @param {unknown[]} items
 * @returns {boolean}
 */
function hasGalleryPreviewImageRows(items) {
	if (!Array.isArray(items)) {
		return false;
	}
	return items.some((row) => {
		if (!row || typeof row !== 'object') {
			return false;
		}
		if (isEmbeddedGalleryItemRow(row)) {
			return false;
		}
		return Boolean(
			(typeof row.src === 'string' && row.src) ||
				(typeof row.thumbnail === 'string' && row.thumbnail) ||
				(typeof row.url === 'string' && row.url)
		);
	});
}

/**
 * First non-embedded image row for the Hover builder preview tile (same row as image metadata).
 *
 * @param {unknown[]} items Bootstrap gallery rows.
 * @returns {{ src: string, alt: string, title: string, description: string }}
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
