/** Custom Grid editor gestures and transient guides; eager preview entry only. */
import {
	Fragment,
	useCallback,
	useContext,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from '@wordpress/element';
import { useStore } from 'react-redux';
import GridLayout, { getCompactor, noCompactor } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import CustomGridLayout from './CustomGridLayout';
import GalleryItem from '../components/GalleryItem';
import InteractionGridGuide from '../components/InteractionGridGuide';
import EditorPreviewPageBreakDivider from '../components/EditorPreviewPageBreakDivider';
import {
	buildCustomGridRglLayout,
	chunkHasMixedExplicitAndImplicit,
	getItemPixelDimensions,
	isGridItemLocked,
} from '../utils/customGridLayout';
import {
	buildCustomGridEditorSections,
	customGridGestureLayoutSignature,
} from '../utils/customGridEditorSections';
import { splitCustomGridDisplayChunks } from '../utils/customGridDisplayChunks';
import { getCustomGridEditorDragCancelSelector } from '../utils/customGridEditorDrag';
import { applyCustomGridLayoutSectionToStore } from '../utils/applyCustomGridLayoutSectionToStore';
import {
	consumeCustomGridRepackPending,
	repackCustomGridPreviewItems,
} from '../utils/repackCustomGridPreviewItems';
import { GalleryPreviewAdminActionsContext } from '../context/GalleryPreviewAdminActionsContext';
import { useGalleryPreviewCustomGridScale } from '../context/GalleryPreviewCustomGridScaleContext';

// Retain Custom Grid's collision displacement and vertical compaction.
const customGridCompactorVertical = getCompactor('vertical');
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
	const [guide, setGuide] = useState(null);
	const [gestureEpoch, setGestureEpoch] = useState(0);
	const previewAdmin = useContext(GalleryPreviewAdminActionsContext);
	// Cancel reads the latest actions without changing identity: its listeners
	// and the cancel-on-layout-change effect must not re-run on a new context value.
	const previewAdminRef = useRef(previewAdmin);
	previewAdminRef.current = previewAdmin;
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
		(sectionIndex, layout, kind) => {
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
			if (kind === 'drag' || kind === 'resize') {
				previewAdmin?.onCustomGridLayoutCommit?.({ kind });
			}
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
		(kind, sectionIndex, item) => {
			if (!gridEditable) {
				return;
			}
			setGuide({ kind, sectionIndex, rectangle: item });
			previewAdmin?.onCustomGridLayoutInteractionStart?.({ kind });
			interactionRef.current = {
				kind,
				sectionIndex,
				layout: null,
			};
		},
		[gridEditable, previewAdmin]
	);

	const endInteraction = useCallback(
		(sectionIndex, layout) => {
			const interaction = interactionRef.current;
			setGuide(null);
			const kind = interaction.kind;
			if (!kind || interaction.sectionIndex !== sectionIndex) {
				return;
			}
			const buffered = interaction.layout;
			interactionRef.current = {
				kind: null,
				sectionIndex: null,
				layout: null,
			};
			const finalLayout = Array.isArray(layout) ? layout : buffered;
			if (gridEditable && Array.isArray(finalLayout)) {
				commitSectionLayout(sectionIndex, finalLayout, kind);
			}
			// After the commit, so the held save includes the gesture's result.
			previewAdmin?.onCustomGridLayoutInteractionEnd?.();
		},
		[gridEditable, commitSectionLayout, previewAdmin]
	);

	const cancelInteraction = useCallback(() => {
		if (!interactionRef.current.kind) {
			return;
		}
		interactionRef.current = {
			kind: null,
			sectionIndex: null,
			layout: null,
		};
		setGuide(null);
		// RGL owns its live layout; remount from the unchanged committed catalog.
		setGestureEpoch((value) => value + 1);
		previewAdminRef.current?.onCustomGridLayoutInteractionEnd?.();
	}, []);
	// Unmounting mid-gesture (e.g. a viewport switch) must not keep saves held.
	useEffect(() => cancelInteraction, [cancelInteraction]);
	useEffect(() => {
		const onKey = (event) => {
			if (event.key === 'Escape') {
				cancelInteraction();
			}
		};
		window.addEventListener('keydown', onKey);
		window.addEventListener('blur', cancelInteraction);
		window.addEventListener('pointercancel', cancelInteraction);
		// Capture loss can precede release; RGL's drag/resize stop owns completion.
		return () => {
			window.removeEventListener('keydown', onKey);
			window.removeEventListener('blur', cancelInteraction);
			window.removeEventListener('pointercancel', cancelInteraction);
		};
	}, [cancelInteraction]);
	const updateGuide = (sectionIndex, layout, item, columns) => {
		if (!interactionRef.current.kind) {
			return;
		}
		// RGL callbacks precede compaction. Use the same engine result as drop.
		const resolved = customGridCompactorVertical
			.compact(layout, columns)
			.find((cell) => cell.i === item.i);
		setGuide({
			kind: interactionRef.current.kind,
			sectionIndex,
			rectangle: { ...(resolved || item) },
		});
	};

	const pageSections = useMemo(
		() => buildCustomGridEditorSections(chunks, gridLayoutWidth, config),
		[chunks, gridLayoutWidth, config]
	);
	// By value: a save response recreates config and chunks with the same
	// values, and must not cancel the drag or resize in progress (ticket 75).
	const gestureLayoutSignature = useMemo(
		() =>
			customGridGestureLayoutSignature(
				gridLayoutWidth,
				gridEditable,
				pageSections
			),
		[gridLayoutWidth, gridEditable, pageSections]
	);
	useLayoutEffect(() => {
		cancelInteraction();
	}, [gestureLayoutSignature, cancelInteraction]);

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
								<div
									className="modula-custom-grid__rgl"
									style={{ position: 'relative' }}
								>
									<InteractionGridGuide
										metrics={{
											columnWidth:
												(gridLayoutWidth -
													section.gutter *
														(section.gridConfig
															.cols -
															1)) /
												section.gridConfig.cols,
											rowHeight:
												section.gridConfig.rowHeight,
											gutterX: section.gutter,
											gutterY: section.gutter,
										}}
										gesture={
											guide?.sectionIndex === si
												? guide.kind
												: null
										}
										rectangle={guide?.rectangle}
									/>
									<GridLayout
										key={`${section.rglKey || si}-${gestureEpoch}`}
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
										onDragStart={(_layout, _old, item) =>
											beginInteraction('drag', si, item)
										}
										onDrag={(nextLayout, _old, item) =>
											updateGuide(
												si,
												nextLayout,
												item,
												section.columns
											)
										}
										onDragStop={(nextLayout) =>
											endInteraction(si, nextLayout)
										}
										onResizeStart={(_layout, _old, item) =>
											beginInteraction('resize', si, item)
										}
										onResize={(nextLayout, _old, item) =>
											updateGuide(
												si,
												nextLayout,
												item,
												section.columns
											)
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

export default function CustomGridEditorLayout() {
	return <CustomGridLayout EditorLayout={CustomGridEditorRglLayout} />;
}
