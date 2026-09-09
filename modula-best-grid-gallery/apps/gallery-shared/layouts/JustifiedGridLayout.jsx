/**
 * Modula Gallery - Justified grid layout
 *
 * Outputs pictures in a justified grid layout using in-house algorithm
 * and shared GalleryItem (hover effects, socials, etc.).
 *
 * Debug: add ?modula_layout_debug=1 to the page URL to show colored blocks
 * instead of images so you can see exactly how the layout is calculated.
 *
 * @package
 */

import { Fragment, useMemo } from '@wordpress/element';
import { useSelector } from 'react-redux';
import GalleryItem from '../components/GalleryItem';
import EditorPreviewPageBreakDivider from '../components/EditorPreviewPageBreakDivider';
import { buildLayoutFlat } from '../utils/justifiedLayout';
import { useContainerWidth } from '../hooks/useContainerWidth';
import { usePreviewCatalogChunks } from '../hooks/usePreviewCatalogChunks';
import { isCaptionBelowImage } from '../utils/captionPlacement';

const ROW_DEBUG_COLORS = [
	'#4a90d9',
	'#7ed321',
	'#bd10e0',
	'#f5a623',
	'#50e3c2',
	'#d0021b',
];

function getDebugColor(rowIndex) {
	return ROW_DEBUG_COLORS[rowIndex % ROW_DEBUG_COLORS.length] ?? '#999';
}

function isLayoutDebugMode() {
	if (typeof window === 'undefined') {
		return false;
	}
	return (
		new URLSearchParams(window.location.search).get(
			'modula_layout_debug'
		) === '1'
	);
}

/**
 * @param {Object}   props
 * @param {Array}    props.chunk
 * @param {number}   props.containerWidth
 * @param {Object}   props.config
 * @param {boolean}  props.layoutDebug
 * @param {number}   props.gutter
 * @param {number}   props.marginPerTile
 * @param {number}   props.rowHeight
 * @param {string}   props.lastRowAlignment
 * @param {string}   props.debugKeyPrefix
 */
function JustifiedGridChunk({
	chunk,
	containerWidth,
	config,
	layoutDebug,
	gutter,
	marginPerTile,
	rowHeight,
	lastRowAlignment,
	debugKeyPrefix,
	captionBelowImage = false,
}) {
	const tileShellOverflow =
		parseInt(config?.shadowSize ?? 0, 10) > 0 ? 'visible' : 'hidden';
	const layoutInput = (chunk || []).map((item) => {
		const w =
			Number(
				item?.imgAttributes?.width ??
					item?.itemAttributes?.['data-width'] ??
					item?.width ??
					0
			) || 1;
		const h =
			Number(
				item?.imgAttributes?.height ??
					item?.itemAttributes?.['data-height'] ??
					item?.height ??
					0
			) || 1;
		return {
			...item,
			src: item?.src || item?.thumbnail || item?.url,
			width: w,
			height: h,
			key: item?.id,
		};
	});

	const flatLayout = buildLayoutFlat(layoutInput, {
		containerWidth,
		rowHeight,
		margin: marginPerTile,
		maxRows: config?.maxRows,
		lastRowAlignment,
	});

	const imgMargin = 2 * marginPerTile;
	const flatLayoutWithVisualRow =
		containerWidth > 0 && flatLayout.length > 0
			? (() => {
					let visualRow = 0;
					let rowWidth = 0;
					return flatLayout.map((item) => {
						const needWidth = (item.viewportWidth ?? 0) + imgMargin;
						if (
							rowWidth + needWidth > containerWidth &&
							rowWidth > 0
						) {
							visualRow += 1;
							rowWidth = 0;
						}
						rowWidth += needWidth;
						return { ...item, visualRowIndex: visualRow };
					});
				})()
			: flatLayout.map((item) => ({
					...item,
					visualRowIndex: item.rowIndex ?? 0,
				}));

	const lastVisualRowIndex =
		flatLayoutWithVisualRow.length > 0
			? flatLayoutWithVisualRow[flatLayoutWithVisualRow.length - 1]
					.visualRowIndex
			: -1;
	const lastRowIndex = lastVisualRowIndex;

	return (
		<div
			style={{
				display: 'flex',
				flexWrap: 'wrap',
				minHeight: 0,
				width: '100%',
			}}
		>
			{flatLayoutWithVisualRow.map((layoutItem, i) => {
				const itemData = chunk?.[i];
				if (!itemData && !layoutDebug) {
					return null;
				}
				const slotWidth = layoutItem.viewportWidth;
				const slotHeight = layoutItem.scaledHeight;
				const nextItem = flatLayoutWithVisualRow[i + 1];
				const currentRowIndex =
					typeof layoutItem.visualRowIndex === 'number'
						? layoutItem.visualRowIndex
						: (layoutItem.rowIndex ?? 0);
				const isLastInRow =
					!nextItem || nextItem.visualRowIndex !== currentRowIndex;
				const isLastRow = currentRowIndex === lastRowIndex;
				const shouldGrowToFill =
					isLastInRow &&
					(currentRowIndex < lastRowIndex ||
						(isLastRow && lastRowAlignment === 'justify'));
				const layoutMarginLeft =
					typeof layoutItem.marginLeft === 'number'
						? layoutItem.marginLeft
						: 0;
				const style = {
					width: slotWidth,
					minWidth: slotWidth,
					margin: marginPerTile,
					position: 'relative',
					flexShrink: 0,
					boxSizing: 'border-box',
					...(captionBelowImage
						? {
								// Image keeps slotHeight; caption hangs below so the photo
								// is not squeezed inside a fixed justified shell.
								height: 'auto',
								minHeight: slotHeight,
								maxHeight: 'none',
								overflow: 'visible',
							}
						: {
								height: slotHeight,
								minHeight: slotHeight,
								maxHeight: slotHeight,
								overflow: tileShellOverflow,
							}),
				};
				if (shouldGrowToFill) {
					style.flexGrow = 1;
					style.maxWidth = 'none';
				} else {
					style.maxWidth = slotWidth;
				}
				if (layoutMarginLeft > 0) {
					style.marginLeft = marginPerTile + layoutMarginLeft;
				}

				if (layoutDebug) {
					return (
						<div
							key={`${debugKeyPrefix}-debug-${i}`}
							style={{
								...style,
								background: getDebugColor(currentRowIndex),
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								fontSize: 11,
								color: '#fff',
								textShadow: '0 0 2px #000',
								textAlign: 'center',
								padding: 4,
								boxSizing: 'border-box',
							}}
							title={`row ${currentRowIndex} · item ${i} · ${slotWidth}×${slotHeight}${shouldGrowToFill ? ' · grow' : ''}`}
						>
							<span style={{ wordBreak: 'break-all' }}>
								R{currentRowIndex} i{i}
								<br />
								{slotWidth}×{slotHeight}
								{shouldGrowToFill ? (
									<>
										<br />
										grow
									</>
								) : null}
							</span>
						</div>
					);
				}

				return (
					<div
						key={itemData.id ?? `${debugKeyPrefix}-${i}`}
						className="modula-justified-tile"
						style={style}
					>
						<GalleryItem
							itemData={itemData}
							config={config}
							slotWidth={slotWidth}
							slotHeight={slotHeight}
							style={
								captionBelowImage
									? {
											position: 'relative',
											width: '100%',
										}
									: {
											position: 'absolute',
											inset: 0,
											width: '100%',
											height: '100%',
										}
							}
							className="modula-item"
						/>
					</div>
				);
			})}
		</div>
	);
}

export default function JustifiedGridLayout() {
	const items = useSelector((state) => state.items.items);
	const config = useSelector((state) => state.gallery.config);
	const { containerRef, containerWidth } = useContainerWidth(0);
	const layoutDebug = isLayoutDebugMode();

	const gutterRaw = parseInt(config?.gutter ?? 10, 10);
	const gutter = Number.isFinite(gutterRaw) ? gutterRaw : 10;
	const marginPerTile = gutter / 2;
	const rowHeightRaw = parseInt(config?.rowHeight ?? 180, 10);
	const rowHeight = Number.isFinite(rowHeightRaw) ? rowHeightRaw : 180;
	const lastRowAlignment = config?.lastRow ?? 'justify';
	const captionBelowImage = isCaptionBelowImage(config);

	const chunks = usePreviewCatalogChunks(items, config);

	const totalItems = useMemo(
		() => chunks.reduce((n, c) => n + c.length, 0),
		[chunks]
	);

	const containerStyle = {
		width: '100%',
		minHeight: 0,
		boxSizing: 'border-box',
		display: 'flex',
		flexDirection: 'column',
		gap: 0,
	};

	return (
		<div
			ref={containerRef}
			className="modula-items modula-justified-grid modula-justified-grid--editor-pages"
			style={containerStyle}
		>
			{layoutDebug && (
				<div
					style={{
						padding: '8px 12px',
						background: '#1a1a1a',
						color: '#eee',
						fontSize: 12,
						fontFamily: 'monospace',
						marginBottom: 8,
						borderRadius: 4,
					}}
				>
					<strong>Layout debug</strong>
					{' · '}
					containerWidth={containerWidth}
					{' · '}
					pages={chunks.length}
					{' · '}
					items={totalItems}
					{' · '}
					gutter={gutter}
					{' · '}
					rowHeight={rowHeight}
					{' · '}
					lastRow={config?.lastRow ?? 'justify'}
				</div>
			)}
			{chunks.map((chunk, ci) => (
				<Fragment key={ci}>
					{ci > 0 ? <EditorPreviewPageBreakDivider /> : null}
					<JustifiedGridChunk
						chunk={chunk}
						containerWidth={containerWidth}
						config={config}
						layoutDebug={layoutDebug}
						gutter={gutter}
						marginPerTile={marginPerTile}
						rowHeight={rowHeight}
						lastRowAlignment={lastRowAlignment}
						debugKeyPrefix={`jg-${ci}`}
						captionBelowImage={captionBelowImage}
					/>
				</Fragment>
			))}
		</div>
	);
}
