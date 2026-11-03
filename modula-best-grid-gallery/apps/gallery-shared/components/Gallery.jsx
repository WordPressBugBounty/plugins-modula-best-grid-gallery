/**
 * Modula Gallery - Top-level component
 * Renders layout by config.type, FilterBar (if enabled), PaginationControls (if enabled).
 * Same wrapper id/classes as PHP shortcode.
 *
 * @package
 */

import {
	lazy,
	Suspense,
	useContext,
	useEffect,
	useMemo,
	useRef,
} from '@wordpress/element';
import { useSelector, shallowEqual } from 'react-redux';
import { GalleryPreviewEagerLayoutsContext } from '../context/GalleryPreviewEagerLayoutsContext';
import { GalleryPreviewFilterBarContext } from '../context/GalleryPreviewFilterBarContext';
import { getLayoutLoader, resolveGalleryLayoutType } from '../layouts';
import GalleryDynamicStyle from './GalleryDynamicStyle';
import { useModulaGalleryLightbox } from '../lightbox/lightboxOpenFacade';
import { useModulaGalleryDeeplink } from '../lightbox/useModulaGalleryDeeplink';
import {
	clearLightboxCatalogCache,
	resolveLightboxItemsForOpen,
} from '../lightbox/resolveLightboxItems';
import { useGalleryImageLoaded } from '../hooks/useGalleryImageLoaded';
import { useGalleryInView } from '../hooks/useGalleryInView';
import { useGalleryProRuntime } from '../hooks/useGalleryProRuntime';
import { useGalleryRootClasses } from '../hooks/useGalleryRootClasses';
import { useGalleryEntrance } from '../hooks/useGalleryEntrance';
import { useGalleryMotionAllowed } from '../hooks/useGalleryMotionAllowed';
import { useHoverPointer } from '../hooks/useHoverPointer';
import { useLayoutMotion } from '../hooks/useLayoutMotion';
import {
	DEFAULT_GALLERY_TYPE,
	isGalleryTypeWithoutFilters,
	isGalleryTypeWithoutPagination,
} from '../constants/galleryLayoutDefaults';
import GalleryTitle from './GalleryTitle';
import GalleryChunkLoadingFallback from './GalleryChunkLoadingFallback';
import VisitorEditGalleryLink from './VisitorEditGalleryLink';
import { selectGalleryShellState } from '../store/selectors/galleryShellSelectors';
import {
	isSettingsEditorPreview,
	shouldHideVisitorChrome,
} from '../utils/displayContext';
import {
	resolveFilterBarPlacements,
	resolveFilterLayoutPreviewViewport,
	resolveFilterLayoutShellClass,
	resolveFilterPositioning,
} from '../utils/filterBarModel';

const LazyFilterBar = lazy(() => import('./FilterBar'));
const LazyPaginationControls = lazy(() => import('./PaginationControls'));
const LazyGalleryLicensingBox = lazy(() => import('./GalleryLicensingBox'));
const LazyGalleryDownloadAllButton = lazy(
	() => import('./GalleryDownloadAllButton')
);

/**
 * @param {{ layoutType: string, EagerLayout: import('react').ComponentType|null }} props
 */
function GalleryLayout({ layoutType, EagerLayout }) {
	const LazyLayout = useMemo(() => {
		const load = getLayoutLoader(layoutType);
		return lazy(load);
	}, [layoutType]);

	if (EagerLayout) {
		return <EagerLayout />;
	}

	return (
		<Suspense fallback={<GalleryChunkLoadingFallback />}>
			<LazyLayout />
		</Suspense>
	);
}

function GalleryFilterBar() {
	return (
		<Suspense fallback={<GalleryChunkLoadingFallback />}>
			<LazyFilterBar />
		</Suspense>
	);
}

export default function Gallery() {
	const eagerLayoutMap = useContext(GalleryPreviewEagerLayoutsContext);
	const PreviewFilterBar = useContext(GalleryPreviewFilterBarContext);
	const {
		config,
		settings,
		metadata,
		galleryId,
		fetchFunction,
		filtering,
		pagination,
		displayItems,
		items,
		originalItems,
		filteredItems,
	} = useSelector(selectGalleryShellState, shallowEqual);
	const hideVisitorChrome = shouldHideVisitorChrome(metadata);

	const rawType = config?.type || DEFAULT_GALLERY_TYPE;
	const layoutType = resolveGalleryLayoutType(config);
	const skipFilters = isGalleryTypeWithoutFilters(rawType);
	const skipPagination = isGalleryTypeWithoutPagination(rawType);
	const showPagination =
		!skipPagination && pagination.enabled && !hideVisitorChrome;

	const lightboxResolveArgsRef = useRef({});
	lightboxResolveArgsRef.current = {
		settings,
		displayItems,
		items,
		originalItems,
		filteredItems,
		fetchFunction,
		galleryId,
		activeFilters: filtering?.activeFilters || [],
		totalItems: pagination?.totalItems,
		shuffleSeed: metadata?.shuffleSeed,
	};

	const resolveLightboxItems = useMemo(
		() => () => resolveLightboxItemsForOpen(lightboxResolveArgsRef.current),
		[]
	);

	useEffect(() => {
		return () => {
			clearLightboxCatalogCache(galleryId);
		};
	}, [galleryId]);

	const catalogItems = originalItems?.length ? originalItems : items;
	const lightboxHostRef = useModulaGalleryLightbox(config, {
		enabled: !hideVisitorChrome,
		items: displayItems,
		settings,
		resolveItems: resolveLightboxItems,
		catalogItems,
	});
	useModulaGalleryDeeplink(lightboxHostRef, config, {
		enabled: !hideVisitorChrome,
		items: displayItems,
		settings,
		resolveItems: resolveLightboxItems,
		catalogItems,
	});
	useGalleryInView(lightboxHostRef, !!config?.inView && !hideVisitorChrome);
	useGalleryImageLoaded(lightboxHostRef, !hideVisitorChrome);
	useGalleryProRuntime(lightboxHostRef, config, settings, {
		imageGuardian: !hideVisitorChrome,
		visitorChrome: !hideVisitorChrome,
	});
	const motionAllowed = useGalleryMotionAllowed(settings, config, metadata);
	useGalleryRootClasses(lightboxHostRef, config, metadata, motionAllowed);
	useGalleryEntrance(lightboxHostRef, settings, metadata, motionAllowed);
	useHoverPointer(lightboxHostRef, motionAllowed);
	useLayoutMotion(lightboxHostRef, settings, config, motionAllowed);

	// Only the visitor filters: the settings-editor canvas draws the static
	// bar its editor provides, or none (Lite ticket 96).
	const PlacedFilterBar = isSettingsEditorPreview(metadata)
		? PreviewFilterBar
		: GalleryFilterBar;
	const showFilters =
		!skipFilters && filtering.enabled && PlacedFilterBar !== null;
	const filterPositioning = resolveFilterPositioning(config, settings);
	const filterPlacements = resolveFilterBarPlacements(filterPositioning);
	const filterLayoutShellClass = resolveFilterLayoutShellClass(
		filterPositioning,
		showFilters
	);
	// Only the settings editor forces a device; none at the visitor.
	const filterLayoutViewport = resolveFilterLayoutPreviewViewport(
		config?.previewViewport
	);

	return (
		<div
			ref={lightboxHostRef}
			className="modula-gallery-react-host"
			style={{ display: 'contents' }}
		>
			<GalleryDynamicStyle />
			<VisitorEditGalleryLink />
			<GalleryTitle />
			<Suspense fallback={null}>
				<LazyGalleryDownloadAllButton placement="above" />
			</Suspense>
			<div
				className={filterLayoutShellClass}
				data-preview-viewport={filterLayoutViewport}
			>
				{showFilters && filterPlacements.before ? (
					<PlacedFilterBar />
				) : null}
				<GalleryLayout
					layoutType={layoutType}
					EagerLayout={eagerLayoutMap?.[layoutType] ?? null}
				/>
				{showFilters && filterPlacements.after ? (
					<PlacedFilterBar />
				) : null}
			</div>
			{showPagination && (
				<Suspense fallback={<GalleryChunkLoadingFallback />}>
					<LazyPaginationControls />
				</Suspense>
			)}
			<Suspense fallback={null}>
				<LazyGalleryDownloadAllButton placement="below" />
			</Suspense>
			{!hideVisitorChrome && (
				<Suspense fallback={null}>
					<LazyGalleryLicensingBox />
				</Suspense>
			)}
			<VisitorEditGalleryLink />
		</div>
	);
}
