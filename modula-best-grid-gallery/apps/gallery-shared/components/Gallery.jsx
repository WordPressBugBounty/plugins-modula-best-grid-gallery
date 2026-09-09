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
import { getLayoutLoader } from '../layouts';
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
import {
	DEFAULT_GALLERY_TYPE,
	isGalleryTypeWithoutFilters,
	isGalleryTypeWithoutPagination,
} from '../constants/galleryLayoutDefaults';
import GalleryTitle from './GalleryTitle';
import GalleryChunkLoadingFallback from './GalleryChunkLoadingFallback';
import { selectGalleryShellState } from '../store/selectors/galleryShellSelectors';
import {
	isSettingsEditorPreview,
	shouldHideVisitorChrome,
} from '../utils/displayContext';
import {
	resolveFilterBarPlacements,
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
	const layoutType =
		rawType === 'grid' && config?.grid_type === 'automatic'
			? 'justified-grid'
			: rawType;
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

	const lightboxHostRef = useModulaGalleryLightbox(config, {
		enabled: !hideVisitorChrome,
		items: displayItems,
		settings,
		resolveItems: resolveLightboxItems,
	});
	useModulaGalleryDeeplink(lightboxHostRef, config, {
		enabled: !hideVisitorChrome,
		items: displayItems,
		settings,
		resolveItems: resolveLightboxItems,
	});
	useGalleryInView(lightboxHostRef, !!config?.inView && !hideVisitorChrome);
	useGalleryImageLoaded(lightboxHostRef, !hideVisitorChrome);
	useGalleryProRuntime(lightboxHostRef, config, settings, {
		imageGuardian: !hideVisitorChrome,
		visitorChrome: !hideVisitorChrome,
	});
	useGalleryRootClasses(lightboxHostRef, config, metadata);

	const showFilters =
		!skipFilters && filtering.enabled && !isSettingsEditorPreview(metadata);
	const filterPositioning = resolveFilterPositioning(config, settings);
	const filterPlacements = resolveFilterBarPlacements(filterPositioning);
	const filterLayoutShellClass = resolveFilterLayoutShellClass(
		filterPositioning,
		showFilters
	);

	return (
		<div
			ref={lightboxHostRef}
			className="modula-gallery-react-host"
			style={{ display: 'contents' }}
		>
			<GalleryDynamicStyle />
			<GalleryTitle />
			<Suspense fallback={null}>
				<LazyGalleryDownloadAllButton placement="above" />
			</Suspense>
			<div className={filterLayoutShellClass}>
				{showFilters && filterPlacements.before ? (
					<GalleryFilterBar />
				) : null}
				<GalleryLayout
					layoutType={layoutType}
					EagerLayout={eagerLayoutMap?.[layoutType] ?? null}
				/>
				{showFilters && filterPlacements.after ? (
					<GalleryFilterBar />
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
				<Suspense fallback={<GalleryChunkLoadingFallback />}>
					<LazyGalleryLicensingBox />
				</Suspense>
			)}
		</div>
	);
}
