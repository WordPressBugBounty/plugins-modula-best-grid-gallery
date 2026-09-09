/**
 * Modula Gallery - Custom grid layout
 *
 * Frontend: bin-packing placement (Packery-style).
 * Settings-editor preview: react-grid-layout for drag/resize on desktop only.
 *
 * @package
 */

import {
	Fragment,
	useCallback,
	useContext,
	useLayoutEffect,
	useMemo,
	useRef,
} from '@wordpress/element';
import { useSelector, useStore } from 'react-redux';
import GridLayout, { getCompactor, noCompactor } from 'react-grid-layout';
import Masonry from 'react-responsive-masonry';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import GalleryItem from '../components/GalleryItem';
import EditorPreviewPageBreakDivider from '../components/EditorPreviewPageBreakDivider';
import { useContainerWidth } from '../hooks/useContainerWidth';
import { isSettingsEditorPreview } from '../utils/displayContext';
import {
	buildCustomGridPackedTiles,
	buildCustomGridRglLayout,
	chunkHasMixedExplicitAndImplicit,
	computeCellSize,
	getItemPixelDimensions,
	getResponsiveForCustomGrid,
	isGridItemLocked,
} from '../utils/customGridLayout';
import { galleryItemRowKey } from '../utils/galleryItemIdentity';
import { usePreviewCatalogChunks } from '../hooks/usePreviewCatalogChunks';
import { splitCustomGridDisplayChunks } from '../utils/customGridDisplayChunks';
import { getCustomGridEditorDragCancelSelector } from '../utils/customGridEditorDrag';
import { applyCustomGridLayoutSectionToStore } from '../utils/applyCustomGridLayoutSectionToStore';
import { editorPreviewUsesNumberedPageBreakDividers } from '../utils/paginationFromSettings';
import {
	consumeCustomGridRepackPending,
	repackCustomGridPreviewItems,
} from '../utils/repackCustomGridPreviewItems';
import { GalleryPreviewAdminActionsContext } from '../context/GalleryPreviewAdminActionsContext';
import { useGalleryPreviewCustomGridScale } from '../context/GalleryPreviewCustomGridScaleContext';
import {
	isCustomGridPreviewLayoutEditable,
	resolveResponsiveColumnsForWidth,
	resolveResponsiveGutterForWidth,
	shouldCustomGridUseColumnFlow,
} from '../utils/resolvePreviewViewport';

const CUSTOM_GRID_RESPONSIVE_LAYOUT = { layout: 'custom-grid' };

function masonryGutterProp(raw) {
	if (raw === null || raw === '') {
		return undefined;
	}
	if (typeof raw === 'string') {
		return raw;
	}
	const n = Number(raw);
	return Number.isFinite(n) ? `${n}px` : undefined;
}

/**
 * Vertical compaction: colliding tiles are pushed down during drag/resize, then
 * compacted upward on drop. preventCollision must stay false — when true, RGL
 * reverts the dragged item instead of displacing neighbors (no push).
 */
const customGridCompactorVertical = getCompactor('vertical');

/**
 * Tablet/mobile: N columns from responsive settings (masonry flow, not custom-grid pack/RGL).
 */
function CustomGridColumnFlowLayout({
	items,
	config,
	containerRef,
	containerWidth,
}) {
	const measureWidth = containerWidth > 0 ? containerWidth : 0;
	const columnsCount = useMemo(
		() =>
			resolveResponsiveColumnsForWidth(
				config,
				measureWidth,
				CUSTOM_GRID_RESPONSIVE_LAYOUT
			),
		[config, measureWidth]
	);
	const gutterRaw = useMemo(
		() =>
			resolveResponsiveGutterForWidth(
				config,
				measureWidth,
				CUSTOM_GRID_RESPONSIVE_LAYOUT
			),
		[config, measureWidth]
	);

	const gutter = masonryGutterProp(gutterRaw);
	const chunks = usePreviewCatalogChunks(items, config);

	if (chunks.length <= 1) {
		const chunk = Array.isArray(chunks[0]) ? chunks[0] : [];
		return (
			<div
				ref={containerRef}
				className="modula-custom-grid-column-flow-host"
				style={{ width: '100%', minWidth: 0 }}
			>
				<Masonry
					className="modula-items modula-custom-grid modula-custom-grid--column-flow modula-masonry-react"
					columnsCount={columnsCount}
					gutter={gutter}
				>
					{chunk.map((item, idx) => (
						<GalleryItem
							key={galleryItemRowKey(item, idx)}
							itemData={item}
							config={config}
						/>
					))}
				</Masonry>
			</div>
		);
	}

	return (
		<div
			ref={containerRef}
			className="modula-custom-grid-column-flow-pages modula-custom-grid--editor-pages"
		>
			{chunks.map((chunk, ci) => (
				<Fragment key={ci}>
					{ci > 0 ? <EditorPreviewPageBreakDivider /> : null}
					<div
						className="modula-custom-grid-column-flow-host"
						style={{ width: '100%', minWidth: 0 }}
					>
						<Masonry
							className="modula-items modula-custom-grid modula-custom-grid--column-flow modula-masonry-react"
							columnsCount={columnsCount}
							gutter={gutter}
						>
							{chunk.map((item, idx) => (
								<GalleryItem
									key={galleryItemRowKey(item, idx)}
									itemData={item}
									config={config}
								/>
							))}
						</Masonry>
					</div>
				</Fragment>
			))}
		</div>
	);
}

const CUSTOM_GRID_RESIZE_HANDLES = Object.freeze([
	'n',
	's',
	'e',
	'w',
	'ne',
	'nw',
	'se',
	'sw',
]);

function CustomGridPackerLayout({
	items,
	config,
	containerRef,
	containerWidth,
	chunkOptions,
}) {
	const chunks = useMemo(
		() => splitCustomGridDisplayChunks(items, chunkOptions),
		[items, chunkOptions]
	);
	const isEditorPreview = isSettingsEditorPreview(chunkOptions?.metadata);
	const showEditorPageDividers =
		isEditorPreview &&
		editorPreviewUsesNumberedPageBreakDividers(
			chunkOptions?.settings || {}
		);
	const tileShellOverflow =
		parseInt(config?.shadowSize ?? 0, 10) > 0 ? 'visible' : 'hidden';

	const pageSections = useMemo(() => {
		if (containerWidth <= 0) {
			return [];
		}
		return chunks.map((chunk) => {
			if (!chunk.length) {
				return { chunk, tiles: [], containerHeight: 0 };
			}
			const { tiles, containerHeight } = buildCustomGridPackedTiles(
				chunk,
				containerWidth,
				config
			);
			return { chunk, tiles, containerHeight };
		});
	}, [chunks, containerWidth, config]);

	return (
		<div
			ref={containerRef}
			className="modula-items modula-custom-grid modula-custom-grid--editor-pages"
			style={{
				display: 'flex',
				flexDirection: 'column',
				gap: 0,
				width: '100%',
				minHeight: 0,
			}}
		>
			{pageSections.map((section, si) => (
				<Fragment key={si}>
					{si > 0 ? (
						showEditorPageDividers ? (
							<EditorPreviewPageBreakDivider />
						) : (
							<div
								className="modula-custom-grid-visitor-page-gap"
								aria-hidden="true"
							/>
						)
					) : null}
					<div
						style={{
							position: 'relative',
							width: '100%',
							height:
								section.tiles.length > 0
									? section.containerHeight
									: 'auto',
							minHeight: 0,
						}}
					>
						{section.tiles.map((tile, i) => {
							const item = section.chunk[i];
							if (!item) {
								return null;
							}
							const isHorizontal = tile.width > tile.height;
							return (
								<div
									key={`${si}-${galleryItemRowKey(item, i)}`}
									className={`modula-item modula-item-tiled ${isHorizontal ? 'tile-h' : 'tile-v'}`}
									style={{
										position: 'absolute',
										left: tile.left,
										top: tile.top,
										width: tile.width,
										height: tile.height,
										boxSizing: 'border-box',
										overflow: tileShellOverflow,
									}}
								>
									<GalleryItem
										itemData={item}
										config={config}
										slotWidth={tile.width}
										slotHeight={tile.height}
										fillSlot
										style={{
											position: 'absolute',
											inset: 0,
											width: '100%',
											height: '100%',
										}}
									/>
								</div>
							);
						})}
					</div>
				</Fragment>
			))}
		</div>
	);
}

function renderCustomGridRglChildren(section, config) {
	return section.chunk.map((item, i) => {
		const layoutItem = section.layout[i];
		if (!item || !layoutItem) {
			return null;
		}
		const dim = getItemPixelDimensions(
			{
				...item,
				width: layoutItem.w,
				height: layoutItem.h,
			},
			section.cellSize,
			section.columns,
			section.gutter,
			section.enableResponsive
		);
		const isHorizontal = dim.width > dim.height;
		const locked = isGridItemLocked(item);
		return (
			<div
				key={layoutItem.i}
				className={`modula-item modula-item-tiled ${isHorizontal ? 'tile-h' : 'tile-v'}${locked ? ' modula-item--grid-locked' : ''}`}
				style={{
					overflow: 'hidden',
					height: '100%',
				}}
			>
				<GalleryItem
					itemData={item}
					config={config}
					slotWidth={dim.width}
					slotHeight={dim.height}
					fillSlot
					style={{
						width: '100%',
						height: '100%',
					}}
				/>
			</div>
		);
	});
}

function CustomGridEditorRglLayout({
	items,
	config,
	containerRef,
	containerWidth,
	gridEditable,
	chunkOptions,
}) {
	const store = useStore();
	const previewAdmin = useContext(GalleryPreviewAdminActionsContext);
	const { scale: customGridPreviewScale } =
		useGalleryPreviewCustomGridScale();
	/**
	 * While dragging/resizing, buffer RGL layout and do not write Redux
	 * (mid-drag commits remount tiles and jump the dragged item).
	 *
	 * @type {import('react').MutableRefObject<{
	 *   kind: null|'drag'|'resize',
	 *   sectionIndex: number|null,
	 *   layout: object[]|null,
	 * }>}
	 */
	const interactionRef = useRef({
		kind: null,
		sectionIndex: null,
		layout: null,
	});

	const gridLayoutWidth =
		containerWidth > 0
			? Math.max(
					280,
					Math.round(
						containerWidth *
							(typeof customGridPreviewScale === 'number' &&
							customGridPreviewScale > 0 &&
							customGridPreviewScale <= 1
								? customGridPreviewScale
								: 1)
					)
				)
			: 0;

	const chunks = useMemo(
		() => splitCustomGridDisplayChunks(items, chunkOptions),
		[items, chunkOptions]
	);

	const commitSectionLayout = useCallback(
		(sectionIndex, layout) => {
			if (!gridEditable || !Array.isArray(layout)) {
				return;
			}
			applyCustomGridLayoutSectionToStore(
				store,
				sectionIndex,
				layout,
				chunks
			);
			previewAdmin?.schedulePersistPreviewItems?.();
		},
		[gridEditable, store, chunks, previewAdmin]
	);

	const handleSectionLayoutChange = useCallback(
		(sectionIndex, layout) => {
			if (!gridEditable || !Array.isArray(layout)) {
				return;
			}
			const interaction = interactionRef.current;
			// Only buffer during drag/resize. Committing on every onLayoutChange
			// (remount, page move, width change) lets RGL's stale key positions
			// overwrite a fresh pack and leave gaps / second-row orphans.
			if (interaction.kind && interaction.sectionIndex === sectionIndex) {
				interaction.layout = layout;
			}
		},
		[gridEditable]
	);

	const beginInteraction = useCallback(
		(kind, sectionIndex) => {
			if (!gridEditable) {
				return;
			}
			interactionRef.current = {
				kind,
				sectionIndex,
				layout: null,
			};
		},
		[gridEditable]
	);

	const endInteraction = useCallback(
		(sectionIndex, layout) => {
			const buffered = interactionRef.current.layout;
			interactionRef.current = {
				kind: null,
				sectionIndex: null,
				layout: null,
			};
			if (!gridEditable) {
				return;
			}
			const finalLayout = Array.isArray(layout) ? layout : buffered;
			if (Array.isArray(finalLayout)) {
				commitSectionLayout(sectionIndex, finalLayout);
			}
		},
		[gridEditable, commitSectionLayout]
	);

	const pageSections = useMemo(() => {
		if (gridLayoutWidth <= 0) {
			return [];
		}
		const { columns, gutter, enableResponsive } =
			getResponsiveForCustomGrid(config);
		const cellSize = computeCellSize(gridLayoutWidth, columns, gutter);
		return chunks.map((chunk, si) => {
			if (!chunk.length) {
				return {
					chunk,
					layout: [],
					gridConfig: null,
					cellSize: 0,
					columns,
					gutter,
					enableResponsive,
					rglKey: `empty-${si}`,
				};
			}
			const { layout, gridConfig } = buildCustomGridRglLayout(
				chunk,
				gridLayoutWidth,
				config
			);
			return {
				chunk,
				layout,
				gridConfig,
				cellSize,
				columns,
				gutter,
				enableResponsive,
				/** Remount RGL when page membership changes — stale key positions leave gaps. */
				rglKey: chunk
					.map((item, idx) => galleryItemRowKey(item, idx))
					.join('|'),
			};
		});
	}, [chunks, gridLayoutWidth, config]);

	useLayoutEffect(() => {
		if (!gridEditable || gridLayoutWidth <= 0) {
			return;
		}
		if (!consumeCustomGridRepackPending()) {
			return;
		}
		const didRepack = repackCustomGridPreviewItems(
			store,
			config,
			gridLayoutWidth
		);
		if (didRepack) {
			previewAdmin?.schedulePersistPreviewItems?.();
		}
	}, [gridEditable, gridLayoutWidth, config, store, previewAdmin, chunks]);

	useLayoutEffect(() => {
		if (!gridEditable || gridLayoutWidth <= 0) {
			return;
		}
		const freshChunks = splitCustomGridDisplayChunks(
			store.getState()?.items?.items ?? [],
			chunkOptions
		);
		for (let si = 0; si < freshChunks.length; si++) {
			const chunk = freshChunks[si];
			if (!chunkHasMixedExplicitAndImplicit(chunk)) {
				continue;
			}
			const { layout } = buildCustomGridRglLayout(
				chunk,
				gridLayoutWidth,
				config
			);
			if (!layout?.length) {
				continue;
			}
			applyCustomGridLayoutSectionToStore(store, si, layout, freshChunks);
		}
	}, [gridEditable, gridLayoutWidth, items, config, store, chunkOptions]);

	return (
		<div
			ref={containerRef}
			className="modula-items modula-custom-grid modula-custom-grid--editor-pages"
			style={{
				display: 'flex',
				flexDirection: 'column',
				gap: 0,
				width: '100%',
				minHeight: 0,
			}}
		>
			{pageSections.map((section, si) => (
				<Fragment key={si}>
					{si > 0 ? <EditorPreviewPageBreakDivider /> : null}
					<div className="modula-custom-grid__preview-scale-outer">
						<div
							className="modula-custom-grid__preview-scale-inner"
							style={{ width: gridLayoutWidth }}
						>
							{section.layout?.length && section.gridConfig ? (
								<div className="modula-custom-grid__rgl">
									<GridLayout
										key={section.rglKey || si}
										width={gridLayoutWidth}
										gridConfig={section.gridConfig}
										layout={section.layout}
										compactor={
											gridEditable
												? customGridCompactorVertical
												: noCompactor
										}
										dragConfig={{
											enabled: gridEditable,
											cancel: getCustomGridEditorDragCancelSelector(),
										}}
										resizeConfig={{
											enabled: gridEditable,
											handles: CUSTOM_GRID_RESIZE_HANDLES,
										}}
										onLayoutChange={(nextLayout) =>
											handleSectionLayoutChange(
												si,
												nextLayout
											)
										}
										onDragStart={() =>
											beginInteraction('drag', si)
										}
										onDragStop={(nextLayout) =>
											endInteraction(si, nextLayout)
										}
										onResizeStart={() =>
											beginInteraction('resize', si)
										}
										onResizeStop={(nextLayout) =>
											endInteraction(si, nextLayout)
										}
										autoSize
									>
										{renderCustomGridRglChildren(
											section,
											config
										)}
									</GridLayout>
								</div>
							) : null}
						</div>
					</div>
				</Fragment>
			))}
		</div>
	);
}

export default function CustomGridLayout() {
	const items = useSelector((state) => state.items.items);
	const config = useSelector((state) => state.gallery.config);
	const metadata = useSelector((state) => state.gallery.metadata);
	const settings = useSelector((state) => state.gallery.settings);
	const pagination = useSelector((state) => state.pagination);
	const { containerRef, containerWidth } = useContainerWidth(0);

	const chunkOptions = useMemo(
		() => ({ pagination, settings, metadata, config }),
		[pagination, settings, metadata, config]
	);

	const isEditorPreview = isSettingsEditorPreview(metadata);
	const useColumnFlow = shouldCustomGridUseColumnFlow(
		config,
		metadata,
		containerWidth
	);
	const gridEditable = isCustomGridPreviewLayoutEditable(config, metadata);

	if (useColumnFlow) {
		return (
			<CustomGridColumnFlowLayout
				items={items}
				config={config}
				containerRef={containerRef}
				containerWidth={containerWidth}
			/>
		);
	}

	if (isEditorPreview) {
		return (
			<CustomGridEditorRglLayout
				items={items}
				config={config}
				containerRef={containerRef}
				containerWidth={containerWidth}
				gridEditable={gridEditable}
				chunkOptions={chunkOptions}
			/>
		);
	}

	return (
		<CustomGridPackerLayout
			items={items}
			config={config}
			containerRef={containerRef}
			containerWidth={containerWidth}
			chunkOptions={chunkOptions}
		/>
	);
}
