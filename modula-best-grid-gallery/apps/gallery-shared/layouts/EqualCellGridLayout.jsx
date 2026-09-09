/**
 * Shared equal-cell CSS grid layout for uniform-grid (cover) and fit-grid (contain).
 *
 * @package
 */

import { Fragment, useMemo } from '@wordpress/element';
import { useSelector } from 'react-redux';
import GalleryItem from '../components/GalleryItem';
import EditorPreviewPageBreakDivider from '../components/EditorPreviewPageBreakDivider';
import { galleryItemRowKey } from '../utils/galleryItemIdentity';
import { usePreviewCatalogChunks } from '../hooks/usePreviewCatalogChunks';
import { useContainerWidth } from '../hooks/useContainerWidth';
import {
	useResponsiveColumns,
	useResponsiveGutter,
} from '../hooks/useResponsiveColumns';
import {
	uniformGridCellAspectRatioFromConfig,
	uniformGridCellMinHeightPx,
} from '../utils/uniformGridTileAspect';
import { fitGridContainObjectPositionFromConfig } from '../utils/fitGridImageAlign';
import {
	captionPlacementLayoutKey,
	isCaptionBelowImage,
} from '../utils/captionPlacement';
import { isEmbeddedGalleryItemRow } from '../utils/embeddedGalleryItemKinds';

/**
 * @typedef {'uniform' | 'fit'} EqualCellGridVariant
 */

/**
 * @return {'square'|'fixed'}
 */
function readUniformModeFromUrl() {
	if (typeof window === 'undefined') {
		return 'square';
	}
	try {
		const q = new URLSearchParams(window.location.search || '');
		const m = (q.get('modula_uniform_mode') || '').toLowerCase();
		if (m === 'fixed' || m === 'height') {
			return 'fixed';
		}
	} catch {
		// ignore
	}
	return 'square';
}

/**
 * @param {number} n
 * @param {number} min
 * @param {number} max
 * @return {number}
 */
function clampInt(n, min, max) {
	const v = Math.round(Number(n));
	if (!Number.isFinite(v)) {
		return min;
	}
	return Math.min(max, Math.max(min, v));
}

/**
 * @param {EqualCellGridVariant} variant
 * @return {{ root: string, cell: string, media: string, pages: string }}
 */
function equalCellGridClasses(variant) {
	const root = variant === 'fit' ? 'modula-fit-grid' : 'modula-uniform-grid';
	return {
		root,
		cell: 'modula-uniform-grid__cell',
		media: 'modula-uniform-grid__media',
		pages:
			variant === 'fit'
				? 'modula-fit-grid-pages'
				: 'modula-uniform-grid-pages',
	};
}

/**
 * @param {Object}   props
 * @param {Object[]} props.items
 * @param {Object}   props.config
 * @param {Object}   props.classes
 * @param {Object}   props.cellAspectStyle
 * @param {number}   props.cellAspectRatio
 * @param {number|null} props.cellMinHeightPx
 * @param {boolean}  props.captionBelowImage
 */
function EqualCellGridCells({
	items,
	config,
	classes,
	cellAspectStyle,
	cellAspectRatio,
	cellMinHeightPx,
	captionBelowImage,
}) {
	return items.map((item, idx) => {
		const isEmbedded = isEmbeddedGalleryItemRow(item);
		const cellStyle =
			captionBelowImage && isEmbedded
				? {
						width: '100%',
						minWidth: 0,
						aspectRatio: cellAspectRatio,
						...(cellMinHeightPx
							? { minHeight: `${cellMinHeightPx}px` }
							: {}),
					}
				: cellAspectStyle;
		return (
			<div
				key={galleryItemRowKey(item, idx)}
				className={classes.cell}
				style={cellStyle}
			>
				<GalleryItem
					itemData={item}
					config={config}
					fillSlot
					imageWrapperClass={classes.media}
				/>
			</div>
		);
	});
}

/**
 * @param {{ variant: EqualCellGridVariant }} props
 */
export default function EqualCellGridLayout({ variant = 'uniform' }) {
	const items = useSelector((state) => state.items.items);
	const config = useSelector((state) => state.gallery.config);
	const { containerRef, containerWidth } = useContainerWidth(0);
	const classes = equalCellGridClasses(variant);

	const mode = useMemo(() => readUniformModeFromUrl(), []);
	const responsive = !!config?.enableResponsive;

	const colsDesktop = clampInt(config?.columns ?? 4, 2, 12);
	const colsTablet = responsive
		? clampInt(config?.tabletColumns ?? 2, 1, 12)
		: colsDesktop;
	const colsMobile = responsive
		? clampInt(config?.mobileColumns ?? 1, 1, 12)
		: colsDesktop;

	const columnCount = useResponsiveColumns(config);
	const gapPx = useResponsiveGutter(config);
	const cellH = clampInt(
		config?.desktopHeight ?? config?.height ?? 280,
		40,
		2000
	);
	const cellAspectRatio = uniformGridCellAspectRatioFromConfig(config);
	const cellMinHeightPx =
		mode === 'fixed'
			? null
			: uniformGridCellMinHeightPx(
					containerWidth,
					columnCount,
					gapPx,
					cellAspectRatio
				);
	const aspectCss =
		typeof config?.uniformGridAspectCss === 'string' &&
		config.uniformGridAspectCss.trim() !== ''
			? config.uniformGridAspectCss.trim()
			: '1 / 1';
	const captionBelowImage = isCaptionBelowImage(config);
	const layoutPlacementKey = captionPlacementLayoutKey(config);
	const containObjectPosition =
		variant === 'fit'
			? fitGridContainObjectPositionFromConfig(config)
			: 'center center';

	const gridClass =
		mode === 'fixed'
			? `modula-items ${classes.root} ${classes.root}--fixed-height ${classes.root}--react-tracks${captionBelowImage ? ` ${classes.root}--caption-below` : ''}`
			: `modula-items ${classes.root} ${classes.root}--react-tracks${captionBelowImage ? ` ${classes.root}--caption-below` : ''}`;

	const gridStyle = useMemo(() => {
		const base = {
			'--modula-uniform-cols': colsDesktop,
			'--modula-uniform-cols-tablet': colsTablet,
			'--modula-uniform-cols-mobile': colsMobile,
			'--modula-uniform-gap': `${gapPx}px`,
			'--modula-uniform-cell-h': `${cellH}px`,
			'--modula-uniform-aspect': aspectCss,
			'--modula-uniform-image-position': containObjectPosition,
			gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
			gap: `${gapPx}px`,
		};
		if (captionBelowImage) {
			base.alignItems = 'start';
			base.gridAutoRows = 'auto';
		} else if (cellMinHeightPx) {
			base.gridAutoRows = `minmax(${cellMinHeightPx}px, auto)`;
		}
		return base;
	}, [
		aspectCss,
		cellH,
		cellMinHeightPx,
		captionBelowImage,
		containObjectPosition,
		colsDesktop,
		colsMobile,
		colsTablet,
		columnCount,
		gapPx,
	]);

	const cellAspectStyle =
		mode === 'fixed'
			? captionBelowImage
				? { width: '100%', minWidth: 0, height: 'auto' }
				: undefined
			: captionBelowImage
				? { width: '100%', minWidth: 0, height: 'auto' }
				: {
						aspectRatio: cellAspectRatio,
						width: '100%',
						minWidth: 0,
						...(cellMinHeightPx
							? { minHeight: `${cellMinHeightPx}px` }
							: {}),
					};

	const chunks = usePreviewCatalogChunks(items, config);
	const cellProps = {
		config,
		classes,
		cellAspectStyle,
		cellAspectRatio,
		cellMinHeightPx,
		captionBelowImage,
	};

	if (chunks.length <= 1) {
		const chunk = Array.isArray(chunks[0]) ? chunks[0] : [];
		return (
			<div
				ref={containerRef}
				className={gridClass}
				style={gridStyle}
				key={layoutPlacementKey}
			>
				<EqualCellGridCells items={chunk} {...cellProps} />
			</div>
		);
	}

	return (
		<div
			ref={containerRef}
			className={classes.pages}
			style={{ width: '100%', minWidth: 0 }}
		>
			{chunks.map((chunk, ci) => (
				<Fragment key={ci}>
					{ci > 0 ? <EditorPreviewPageBreakDivider /> : null}
					<div
						className={gridClass}
						style={gridStyle}
						key={`${layoutPlacementKey}-${ci}`}
					>
						<EqualCellGridCells items={chunk} {...cellProps} />
					</div>
				</Fragment>
			))}
		</div>
	);
}
