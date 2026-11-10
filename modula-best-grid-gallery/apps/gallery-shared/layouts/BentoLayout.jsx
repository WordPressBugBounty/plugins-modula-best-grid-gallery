/**
 * Modula Gallery - Bento layout (`bento` gallery type)
 *
 * Renders `layoutBento` (utils/bentoLayout.js) as a CSS grid of square cells:
 * every tile gets explicit `grid-column` / `grid-row` lines from the engine,
 * never auto-placement, so the grid is exactly the one the engine closed.
 * Row height equals column width through container query units on the host
 * (index.scss `.modula-bento`), so the grid has its final height at first
 * paint without measuring.
 *
 * The engine runs over the visible items: the store's `items` are already
 * the filtered / current-page / loaded-so-far list on the visitor, and the
 * settings-editor preview splits them per page like the other chunked
 * layouts. Tiles are keyed by item, so on load more the tiles above the tail
 * keep their element and their placement.
 *
 * Tile chrome (captions, hover, lightbox links, border radius, content block
 * and shortcode tiles) and the focus-point framing are GalleryItem's, as on
 * BnB: `fillSlot` covers the cell and the item's stored focal point / crop
 * positions the photo.
 *
 * @package
 */

import { Fragment, useMemo } from '@wordpress/element';
import { useSelector } from 'react-redux';
import GalleryItem from '../components/GalleryItem';
import EditorPreviewPageBreakDivider from '../components/EditorPreviewPageBreakDivider';
import {
	useResponsiveColumns,
	useResponsiveGutter,
} from '../hooks/useResponsiveColumns';
import { usePreviewCatalogChunks } from '../hooks/usePreviewCatalogChunks';
import { galleryItemRowKey } from '../utils/galleryItemIdentity';
import { layoutBento, normalizeBentoTracks } from '../utils/bentoLayout';
import { resolveGalleryItemIntrinsicDimensions } from '../utils/galleryItemIntrinsicDimensions';
import {
	isContentBlockGalleryItemRow,
	isEmbeddedGalleryItemRow,
} from '../utils/embeddedGalleryItemKinds';

/** GalleryItem fills its cell; the cell is the grid area. */
const TILE_ITEM_STYLE = {
	position: 'absolute',
	inset: 0,
	width: '100%',
	height: '100%',
};

/**
 * Item kind as the engine reads it. Embedded rows may arrive without
 * `itemKind` (bootstrap / legacy paths), so they are recognised by shape.
 *
 * @param {Object} item Gallery item.
 * @return {string|undefined} `content_block`, `shortcode` or the stored kind.
 */
function bentoItemKind(item) {
	if (isContentBlockGalleryItemRow(item)) {
		return 'content_block';
	}
	if (isEmbeddedGalleryItemRow(item)) {
		return 'shortcode';
	}
	return item?.itemKind;
}

/**
 * The photo's own proportions. The loaded file can be cropped to the grid
 * image size (a custom size with crop, or a hard-cropped registered size such
 * as Thumbnail), which would give every tile one shape, so the attachment's
 * Full size (`fullImageSize`, sent for Bento items) comes first.
 *
 * @param {Object} item   Gallery item.
 * @param {Object} config Gallery config.
 * @return {{ width: number|undefined, height: number|undefined }} Dimensions.
 */
function bentoItemDimensions(item, config) {
	const full = item?.fullImageSize;
	if (full?.width > 0 && full?.height > 0) {
		return { width: full.width, height: full.height };
	}
	return resolveGalleryItemIntrinsicDimensions(item, config);
}

/**
 * @param {Object} item   Gallery item.
 * @param {Object} config Gallery config.
 * @return {{ kind: string|undefined, ratio: number|undefined }} Engine input; a
 *         video's tile image is its poster, so its dimensions are the poster's.
 */
function bentoItemInput(item, config) {
	const { width, height } = bentoItemDimensions(item, config);
	return {
		kind: bentoItemKind(item),
		ratio: width && height ? width / height : undefined,
	};
}

/**
 * @param {{ column: number, row: number, colSpan: number, rowSpan: number }} tile 0-based engine placement.
 * @return {Object} CSS grid lines (1-based), plus the spans for the stylesheet's
 *                  fallback where container query units are missing.
 */
function gridArea(tile) {
	return {
		gridColumn: `${tile.column + 1} / span ${tile.colSpan}`,
		gridRow: `${tile.row + 1} / span ${tile.rowSpan}`,
		'--modula-bento-col-span': tile.colSpan,
		'--modula-bento-row-span': tile.rowSpan,
	};
}

/**
 * One closed Bento grid over a list of items.
 *
 * @param {Object}   props
 * @param {Object[]} props.items  Visible items of this page, in order.
 * @param {Object}   props.config Gallery config.
 * @param {number}   props.tracks Grid tracks (at least 2).
 * @param {number}   props.gutter Gap between cells in px.
 * @return {JSX.Element} The grid host and its tiles.
 */
function BentoGrid({ items, config, tracks, gutter }) {
	const layout = useMemo(
		() =>
			layoutBento(
				items.map((item) => bentoItemInput(item, config)),
				{ columns: tracks }
			),
		[items, config, tracks]
	);

	return (
		<div className="modula-bento-host">
			<div
				className="modula-items modula-bento"
				data-bento-tracks={tracks}
				data-bento-rows={layout.rows}
				style={{
					'--modula-bento-tracks': tracks,
					'--modula-bento-gaps': `${(tracks - 1) * gutter}px`,
					gridTemplateColumns: `repeat(${tracks}, minmax(0, 1fr))`,
					gap: `${gutter}px`,
				}}
			>
				{layout.tiles.map((tile, index) => {
					const item = items[index];
					return (
						<div
							key={galleryItemRowKey(item, index)}
							className="modula-bento-tile"
							style={gridArea(tile)}
						>
							<GalleryItem
								itemData={item}
								config={config}
								fillSlot
								style={TILE_ITEM_STYLE}
							/>
						</div>
					);
				})}
			</div>
		</div>
	);
}

export default function BentoLayout() {
	const items = useSelector((state) => state.items.items);
	const config = useSelector((state) => state.gallery.config);
	const tracks = normalizeBentoTracks(useResponsiveColumns(config));
	const gutter = Number(useResponsiveGutter(config)) || 0;
	const chunks = usePreviewCatalogChunks(items, config);

	if (chunks.length <= 1) {
		return (
			<BentoGrid
				items={Array.isArray(chunks[0]) ? chunks[0] : []}
				config={config}
				tracks={tracks}
				gutter={gutter}
			/>
		);
	}

	return (
		<div className="modula-bento-pages">
			{chunks.map((chunk, chunkIndex) => (
				<Fragment key={chunkIndex}>
					{chunkIndex > 0 ? <EditorPreviewPageBreakDivider /> : null}
					<BentoGrid
						items={chunk}
						config={config}
						tracks={tracks}
						gutter={gutter}
					/>
				</Fragment>
			))}
		</div>
	);
}
