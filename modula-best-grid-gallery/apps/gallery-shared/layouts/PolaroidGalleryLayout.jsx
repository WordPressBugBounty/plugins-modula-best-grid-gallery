/**
 * Modula Gallery - Polaroid layout (packery slots + white frame, tilt, optional pin).
 *
 * @package
 */

import { Fragment, useMemo } from '@wordpress/element';
import { useSelector } from 'react-redux';
import GalleryItem from '../components/GalleryItem';
import EditorPreviewPageBreakDivider from '../components/EditorPreviewPageBreakDivider';
import { useContainerWidth } from '../hooks/useContainerWidth';
import {
	usePolaroidUniformColumns,
	useResponsiveGutter,
} from '../hooks/useResponsiveColumns';
import {
	generatePackeryTiles,
	hashLayoutSeedString,
} from '../utils/packeryLayout';
import {
	generateUniformPortraitPolaroidTiles,
	uniformPolaroidSectionHeight,
} from '../utils/polaroidUniformSlots';
import {
	resolvePolaroidChinInset,
	resolvePolaroidEffectiveChinHeight,
} from '../utils/polaroidCaptionChin';
import { polaroidTransformForIndex } from '../utils/polaroidTransform';
import { polaroidFrameBoxShadow } from '../utils/polaroidFrameShadow';
import { isCaptionBelowImage } from '../utils/captionPlacement';
import { galleryItemRowKey } from '../utils/galleryItemIdentity';
import { usePreviewCatalogChunks } from '../hooks/usePreviewCatalogChunks';
import { resolveResponsiveGalleryHeight } from '../utils/resolvePreviewViewport';

const DEFAULT_POLAROID = {
	randomFactor: 0.5,
	rotationMax: 7,
	scatterMax: 12,
	showPin: true,
	framePadding: 12,
	chinHeight: 36,
	uniformSize: true,
	uniformColumns: 3,
};

/** Packery layouts always honor layout tablet/mobile gutter (Heights-style breakpoints). */
export default function PolaroidGalleryLayout() {
	const items = useSelector((state) => state.items.items);
	const config = useSelector((state) => state.gallery.config);
	const galleryId = useSelector((state) => state.gallery.galleryId ?? 0);
	const { containerRef, containerWidth } = useContainerWidth(0);

	const polaroid = { ...DEFAULT_POLAROID, ...(config?.polaroid || {}) };
	const uniformSize =
		polaroid.uniformSize === true ||
		polaroid.uniformSize === 1 ||
		polaroid.uniformSize === '1';
	const uniformColumnsSetting = Math.min(
		12,
		Math.max(0, parseInt(polaroid.uniformColumns, 10) || 0)
	);

	/** Same as creative-gallery: responsive gutters by viewport. */
	const gutter = parseInt(
		useResponsiveGutter(
			uniformSize ? config : { ...config, enableResponsive: 1 }
		) ?? 0,
		10
	);
	/** Packery canvas height; 0 / invalid → 800 (same as creative-gallery). */
	const height = resolveResponsiveGalleryHeight(config);
	const uniformColumns = usePolaroidUniformColumns(
		config,
		uniformColumnsSetting
	);

	const polaroidRandomFactor = Number(polaroid.randomFactor ?? 0);
	const rotationMax = Math.min(
		14,
		Math.max(0, Number(polaroid.rotationMax) || 0)
	);
	const scatterMax = Math.min(
		28,
		Math.max(0, Number(polaroid.scatterMax) || 0)
	);
	/* Match `settingsToConfig.js` / PHP defaults — anything except false/0/'0' shows the pin. */
	const showPin =
		polaroid.showPin !== false &&
		polaroid.showPin !== 0 &&
		polaroid.showPin !== '0';
	const framePadding = Math.min(
		28,
		Math.max(4, parseInt(polaroid.framePadding, 10) || 12)
	);
	const chinHeight = Math.min(
		80,
		Math.max(12, parseInt(polaroid.chinHeight, 10) || 36)
	);

	const frameShadow = polaroidFrameBoxShadow(
		config?.shadowSize,
		config?.shadowColor
	);
	const captionInChin = isCaptionBelowImage(config);
	const effectiveChinHeight = captionInChin
		? resolvePolaroidEffectiveChinHeight(chinHeight)
		: chinHeight;
	const chinInset = resolvePolaroidChinInset(framePadding);

	const chunks = usePreviewCatalogChunks(items, config);

	const pageSections = useMemo(() => {
		if (containerWidth <= 0) {
			return [];
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
				`${galleryId}|polaroid|${sectionIndex}|${
					uniformSize ? 'uniform' : 'packery'
				}|${idKey}|${polaroidRandomFactor}|${gutter}|${Math.round(
					Number(height) || 0
				)}|${rotationMax}|${scatterMax}|${framePadding}|${effectiveChinHeight}|${uniformColumns}`
			);
			const tiles = uniformSize
				? generateUniformPortraitPolaroidTiles(
						containerWidth,
						count,
						gutter,
						uniformColumns
					)
				: generatePackeryTiles(containerWidth, height, count, {
						gutter,
						randomFactor: polaroidRandomFactor,
						layoutSeed,
					});
			const uniformSectionHeight = uniformSize
				? uniformPolaroidSectionHeight(tiles)
				: 0;
			const sectionHeight =
				uniformSize && uniformSectionHeight > 0
					? Math.max(
							Math.round(Number(height) || 0),
							uniformSectionHeight
						)
					: Math.round(Number(height) || 0);
			return {
				chunk,
				tiles,
				layoutSeed,
				sectionHeight,
			};
		});
	}, [
		chunks,
		containerWidth,
		height,
		gutter,
		polaroidRandomFactor,
		galleryId,
		rotationMax,
		scatterMax,
		framePadding,
		effectiveChinHeight,
		uniformSize,
		uniformColumns,
	]);

	return (
		<div
			ref={containerRef}
			className={
				'modula-items modula-polaroid-gallery modula-polaroid-gallery--editor-pages' +
				(uniformSize ? ' modula-polaroid-gallery--uniform-size' : '') +
				(captionInChin
					? ' modula-polaroid-gallery--caption-in-chin'
					: '')
			}
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
								section.tiles.length > 0
									? (section.sectionHeight ?? height)
									: 'auto',
							minHeight: 0,
							overflow: 'visible',
						}}
					>
						{section.tiles.map((tile, i) => {
							const item = section.chunk[i];
							if (!item) {
								return null;
							}
							const t = polaroidTransformForIndex(
								section.layoutSeed,
								i,
								rotationMax,
								scatterMax,
								polaroidRandomFactor,
								showPin
							);
							const transform = `rotate(${t.rotationDeg}deg) translate(${t.translateX}px, ${t.translateY}px)`;
							return (
								<div
									key={`${si}-${galleryItemRowKey(item, i)}`}
									className="modula-item modula-item-tiled modula-polaroid-slot"
									style={{
										position: 'absolute',
										left: tile.left,
										top: tile.top,
										width: tile.width,
										height: tile.height,
										boxSizing: 'border-box',
										overflow: 'visible',
										zIndex: 0,
									}}
								>
									<div
										className={
											showPin
												? 'modula-polaroid-frame modula-polaroid-frame--has-pin'
												: 'modula-polaroid-frame'
										}
										style={{
											width: '100%',
											height: '100%',
											boxSizing: 'border-box',
											display: 'flex',
											flexDirection: 'column',
											background: '#fff',
											padding: captionInChin
												? `${framePadding}px ${framePadding}px 0`
												: `${framePadding}px ${framePadding}px ${effectiveChinHeight}px`,
											'--modula-polaroid-chin-height': `${effectiveChinHeight}px`,
											'--modula-polaroid-chin-inset': `${chinInset}px`,
											boxShadow: frameShadow,
											transform,
											transformOrigin: 'center center',
											borderRadius: 1,
											position: 'relative',
										}}
									>
										{showPin && t.pinColor ? (
											<span
												className="modula-polaroid-pin"
												style={{
													background: t.pinColor,
												}}
												aria-hidden="true"
											/>
										) : null}
										<div
											className="modula-polaroid-frame__media"
											style={{
												position: 'relative',
												flex: '1 1 auto',
												minHeight: 0,
												overflow: 'hidden',
											}}
										>
											<GalleryItem
												itemData={item}
												config={config}
												slotWidth={
													tile.width -
													framePadding * 2
												}
												slotHeight={
													tile.height -
													framePadding -
													effectiveChinHeight
												}
												style={{
													position: 'absolute',
													inset: 0,
													width: '100%',
													height: '100%',
												}}
											/>
										</div>
									</div>
								</div>
							);
						})}
					</div>
				</Fragment>
			))}
		</div>
	);
}
