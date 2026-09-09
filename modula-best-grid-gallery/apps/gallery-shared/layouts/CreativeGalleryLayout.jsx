/**
 * Modula Gallery - Creative gallery layout
 *
 * Uses packery-style bin-packing (generatePackeryTiles) for tile positions
 * and renders GalleryItem in each tile.
 *
 * @package
 */

import { Fragment, useMemo } from '@wordpress/element';
import { useSelector } from 'react-redux';
import GalleryItem from '../components/GalleryItem';
import EditorPreviewPageBreakDivider from '../components/EditorPreviewPageBreakDivider';
import { useContainerWidth } from '../hooks/useContainerWidth';
import { useResponsiveGutter } from '../hooks/useResponsiveColumns';
import { resolveResponsiveGalleryHeight } from '../utils/resolvePreviewViewport';
import {
	generatePackeryTiles,
	hashLayoutSeedString,
} from '../utils/packeryLayout';
import { galleryItemRowKey } from '../utils/galleryItemIdentity';
import { usePreviewCatalogChunks } from '../hooks/usePreviewCatalogChunks';
import { isCaptionBelowImage } from '../utils/captionPlacement';

export default function CreativeGalleryLayout() {
	const items = useSelector((state) => state.items.items);
	const config = useSelector((state) => state.gallery.config);
	const galleryId = useSelector((state) => state.gallery.galleryId ?? 0);
	const { containerRef, containerWidth } = useContainerWidth(0);

	const gutter = parseInt(
		useResponsiveGutter({ ...config, enableResponsive: 1 }) ?? 0,
		10
	);
	const randomFactor = Number(config?.randomFactor ?? 0);
	const height = resolveResponsiveGalleryHeight(config);
	const captionBelowImage = isCaptionBelowImage(config);
	const tileShellOverflow =
		parseInt(config?.shadowSize ?? 0, 10) > 0 ? 'visible' : 'hidden';

	const chunks = usePreviewCatalogChunks(items, config);

	const pageSections = useMemo(() => {
		if (containerWidth <= 0) {
			return chunks.map((chunk) => ({ chunk, tiles: [] }));
		}
		return chunks.map((chunk, sectionIndex) => {
			const count = chunk.length;
			if (count === 0) {
				return { chunk, tiles: [] };
			}
			const idKey = chunk
				.map((it, idx) => galleryItemRowKey(it, idx))
				.join(':');
			const layoutSeed = hashLayoutSeedString(
				`${galleryId}|${sectionIndex}|${idKey}|${randomFactor}|${gutter}|${Math.round(
					Number(height) || 0
				)}|${captionBelowImage ? 'below-image' : 'inside-image'}`
			);
			const tiles = generatePackeryTiles(containerWidth, height, count, {
				gutter,
				randomFactor,
				layoutSeed,
			});
			return { chunk, tiles };
		});
	}, [
		chunks,
		containerWidth,
		height,
		gutter,
		randomFactor,
		galleryId,
		captionBelowImage,
	]);

	return (
		<div
			ref={containerRef}
			className="modula-items modula-creative-gallery modula-creative-gallery--editor-pages"
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
					<div
						style={{
							position: 'relative',
							width: '100%',
							height:
								section.tiles.length > 0 || containerWidth <= 0
									? height
									: 'auto',
							minHeight: height,
						}}
					>
						{section.tiles.map((tile, i) => {
							const item = section.chunk[i];
							if (!item) {
								return null;
							}
							return (
								<div
									key={`${si}-${galleryItemRowKey(item, i)}`}
									className="modula-item modula-item-tiled"
									data-tile-width={Math.round(tile.width)}
									data-tile-height={Math.round(tile.height)}
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
