/**
 * Modula Gallery - Creative gallery, Mosaic engine: one page of tiles.
 *
 * Rows of columns from `layoutMosaic` (Jetpack Tiled Gallery's mosaic), each
 * row a flex line and each column a flex stack with the gutter between
 * neighbours, so a caption below an image can push its column taller the way
 * Justified lets captions hang below the photo.
 *
 * @package
 */

import { useMemo } from '@wordpress/element';
import GalleryItem from '../components/GalleryItem';
import { layoutMosaic } from '../utils/mosaicLayout';
import { isMosaicWide } from '../utils/creativeEngine';
import { galleryItemRowKey } from '../utils/galleryItemIdentity';
import { getLayoutDebugColor } from '../utils/layoutDebug';
import { resolveGalleryItemIntrinsicDimensions } from '../utils/galleryItemIntrinsicDimensions';

/**
 * @param {Object} item   Gallery item.
 * @param {Object} config Gallery config.
 * @return {{ width: number, height: number }} Bitmap proportions, as Justified reads them.
 */
function itemDimensions(item, config) {
	const intrinsic = resolveGalleryItemIntrinsicDimensions(item, config);
	return {
		width:
			intrinsic.width ??
			(Number(item?.itemAttributes?.['data-width']) || 1),
		height:
			intrinsic.height ??
			(Number(item?.itemAttributes?.['data-height']) || 1),
	};
}

/**
 * Group the flat tile list back into rows of columns, in reading order.
 *
 * @param {{ rows: Array<{ shape: number[] }>, tiles: Array<{ rowIndex: number, columnIndex: number }> }} layout From `layoutMosaic`.
 * @return {Array<{ shape: number[], columns: Object[][] }>} Per row, its tiles per column.
 */
function rowsOfTiles(layout) {
	const rows = layout.rows.map((row) => ({
		shape: row.shape,
		columns: row.shape.map(() => []),
	}));
	for (const tile of layout.tiles) {
		rows[tile.rowIndex].columns[tile.columnIndex].push(tile);
	}
	return rows;
}

/**
 * @param {Object} props
 * @param {Object} props.tile
 * @param {number} props.chunkIndex
 * @return {JSX.Element}
 */
function MosaicDebugTile({ tile, chunkIndex }) {
	return (
		<div
			style={{
				width: tile.width,
				height: tile.height,
				background: getLayoutDebugColor(tile.rowIndex),
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
			title={`page ${chunkIndex} · row ${tile.rowIndex} · column ${tile.columnIndex} · item ${tile.index} · ${tile.width}×${tile.height}`}
		>
			<span style={{ wordBreak: 'break-all' }}>
				R{tile.rowIndex} C{tile.columnIndex} i{tile.index}
				<br />
				{tile.width}×{tile.height}
			</span>
		</div>
	);
}

/**
 * One photo in its integer cell. The cell already has the photo's ratio, so
 * nothing is cropped; `slotWidth` / `slotHeight` let the item load a sharp size.
 *
 * @param {Object}  props
 * @param {Object}  props.item
 * @param {Object}  props.tile              `{ index, width, height }` from `layoutMosaic`.
 * @param {Object}  props.config
 * @param {boolean} props.captionBelowImage
 * @param {string}  props.shellOverflow     `visible` when a shadow must paint outside the cell.
 * @return {JSX.Element}
 */
function MosaicTile({ item, tile, config, captionBelowImage, shellOverflow }) {
	const shellStyle = captionBelowImage
		? {
				// The photo keeps its computed height; the caption hangs below, as in Justified.
				height: 'auto',
				minHeight: tile.height,
				overflow: 'visible',
			}
		: {
				height: tile.height,
				overflow: shellOverflow,
			};
	const itemStyle = captionBelowImage
		? { position: 'relative', width: '100%' }
		: { position: 'absolute', inset: 0, width: '100%', height: '100%' };
	return (
		<div
			className="modula-item modula-item-tiled"
			data-tile-width={tile.width}
			data-tile-height={tile.height}
			style={{
				position: 'relative',
				width: tile.width,
				boxSizing: 'border-box',
				...shellStyle,
			}}
		>
			<GalleryItem
				itemData={item}
				config={config}
				slotWidth={tile.width}
				slotHeight={tile.height}
				style={itemStyle}
			/>
		</div>
	);
}

/**
 * @param {Object}   props
 * @param {Object[]} props.chunk             Items of this page, in order.
 * @param {number}   props.chunkIndex        Page index (keys and debug labels).
 * @param {number}   props.containerWidth    Measured gallery width in px (0 until measured).
 * @param {Object}   props.config            Gallery config.
 * @param {number}   props.gutter            Gap between tiles in px.
 * @param {boolean}  props.captionBelowImage Caption hangs below the photo instead of over it.
 * @param {boolean}  props.layoutDebug       Paint coloured blocks instead of images.
 * @return {JSX.Element|null}
 */
export default function CreativeMosaicChunk({
	chunk,
	chunkIndex,
	containerWidth,
	config,
	gutter,
	captionBelowImage = false,
	layoutDebug = false,
}) {
	const shellOverflow =
		parseInt(config?.shadowSize ?? 0, 10) > 0 ? 'visible' : 'hidden';

	const layout = useMemo(
		() =>
			layoutMosaic(
				chunk.map((item) => itemDimensions(item, config)),
				{
					containerWidth,
					gutter,
					wide: isMosaicWide(containerWidth),
				}
			),
		[chunk, config, containerWidth, gutter]
	);

	if (layout.tiles.length === 0) {
		return null;
	}

	const renderTile = (tile) => {
		if (layoutDebug) {
			return (
				<MosaicDebugTile
					key={`${chunkIndex}-debug-${tile.index}`}
					tile={tile}
					chunkIndex={chunkIndex}
				/>
			);
		}
		const item = chunk[tile.index];
		if (!item) {
			return null;
		}
		return (
			<MosaicTile
				key={`${chunkIndex}-${galleryItemRowKey(item, tile.index)}`}
				item={item}
				tile={tile}
				config={config}
				captionBelowImage={captionBelowImage}
				shellOverflow={shellOverflow}
			/>
		);
	};

	return (
		<div className="modula-mosaic-rows" style={{ width: '100%' }}>
			{rowsOfTiles(layout).map((row, rowIndex) => (
				<div
					key={`${chunkIndex}-row-${rowIndex}`}
					className="modula-mosaic-row"
					data-mosaic-shape={row.shape.join(',')}
					style={{
						display: 'flex',
						alignItems: 'flex-start',
						gap: gutter,
						marginTop: rowIndex > 0 ? gutter : 0,
					}}
				>
					{row.columns.map((tiles, columnIndex) => (
						<div
							key={`${chunkIndex}-row-${rowIndex}-col-${columnIndex}`}
							className="modula-mosaic-column"
							style={{
								display: 'flex',
								flexDirection: 'column',
								gap: gutter,
								flex: '0 0 auto',
								width: tiles[0]?.width ?? 0,
							}}
						>
							{tiles.map(renderTile)}
						</div>
					))}
				</div>
			))}
		</div>
	);
}
