/**
 * Modula Gallery - Creative gallery layout
 *
 * Two tile engines, chosen per gallery by `config.creativeEngine`
 * (`utils/creativeEngine.js`):
 *
 * - `packery` (default): packery-style bin-packing (generatePackeryTiles) on a
 *   fixed-height canvas; every tile crops its photo.
 * - `mosaic`: Jetpack-style rows of columns at the photos' own ratios
 *   (CreativeMosaicChunk); the gallery grows with its photos.
 *
 * @package
 */

import { Fragment, useMemo } from '@wordpress/element';
import { useSelector } from 'react-redux';
import GalleryItem from '../components/GalleryItem';
import EditorPreviewPageBreakDivider from '../components/EditorPreviewPageBreakDivider';
import CreativeMosaicChunk from './CreativeMosaicChunk';
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
import { isMosaicCreativeEngine } from '../utils/creativeEngine';
import { isLayoutDebugMode } from '../utils/layoutDebug';

/**
 * @param {Object} config Gallery config.
 * @return {number} Gutter for the current breakpoint, in px.
 */
function useCreativeGutter(config) {
	return parseInt(
		useResponsiveGutter({ ...config, enableResponsive: 1 }) ?? 0,
		10
	);
}

/**
 * Mosaic engine: rows of columns per page, no fixed height.
 *
 * @return {JSX.Element}
 */
function CreativeMosaicLayout() {
	const items = useSelector((state) => state.items.items);
	const config = useSelector((state) => state.gallery.config);
	const { containerRef, containerWidth } = useContainerWidth(0);
	const gutter = useCreativeGutter(config);
	const captionBelowImage = isCaptionBelowImage(config);
	const layoutDebug = isLayoutDebugMode();
	const chunks = usePreviewCatalogChunks(items, config);

	return (
		<div
			ref={containerRef}
			className="modula-items modula-creative-gallery modula-creative-gallery--mosaic modula-creative-gallery--editor-pages"
			style={{
				display: 'flex',
				flexDirection: 'column',
				gap: 0,
				width: '100%',
				minHeight: 0,
			}}
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
					engine=mosaic
					{' · '}
					containerWidth={containerWidth}
					{' · '}
					pages={chunks.length}
					{' · '}
					gutter={gutter}
				</div>
			)}
			{chunks.map((chunk, chunkIndex) => (
				<Fragment key={chunkIndex}>
					{chunkIndex > 0 ? <EditorPreviewPageBreakDivider /> : null}
					<CreativeMosaicChunk
						chunk={chunk}
						chunkIndex={chunkIndex}
						containerWidth={containerWidth}
						config={config}
						gutter={gutter}
						captionBelowImage={captionBelowImage}
						layoutDebug={layoutDebug}
					/>
				</Fragment>
			))}
		</div>
	);
}

/**
 * Packery engine: a fixed-height canvas per page, split into tiles.
 *
 * @return {JSX.Element}
 */
function CreativePackeryLayout() {
	const items = useSelector((state) => state.items.items);
	const config = useSelector((state) => state.gallery.config);
	const galleryId = useSelector((state) => state.gallery.galleryId ?? 0);
	const { containerRef, containerWidth } = useContainerWidth(0);

	const gutter = useCreativeGutter(config);
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

export default function CreativeGalleryLayout() {
	const config = useSelector((state) => state.gallery.config);
	if (isMosaicCreativeEngine(config)) {
		return <CreativeMosaicLayout />;
	}
	return <CreativePackeryLayout />;
}
