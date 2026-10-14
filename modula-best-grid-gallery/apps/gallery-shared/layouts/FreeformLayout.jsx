/** Shared whole-catalog Freeform paint. Editor interaction is supplied by the preview. */
import { useMemo } from '@wordpress/element';
import { useSelector } from 'react-redux';
import GalleryItem from '../components/GalleryItem';
import { useContainerWidth } from '../hooks/useContainerWidth';
import {
	freeformOccurrenceIds,
	resolveFreeformComposition,
	freeformDeviceGutter,
	freeformMetrics,
	freeformPaint,
} from '../utils/freeformGeometry';
import {
	getForcedPreviewViewport,
	resolveResponsiveDeviceFromWidth,
} from '../utils/resolvePreviewViewport';

export function FreeformSurface({
	items,
	config,
	composition,
	metrics,
	device,
	editor = false,
	onTilePointerDown,
	onTileClickCapture,
	tileControls,
	children,
}) {
	const { rectangles, height } = freeformPaint(composition, metrics, device);
	return (
		<div
			className={`modula-items modula-freeform${editor ? ' modula-freeform--editor' : ''}`}
			style={{
				position: 'relative',
				width: '100%',
				height,
				minHeight: editor && !items.length ? 160 : 0,
			}}
		>
			{composition.map((placement, index) => {
				const rectangle = rectangles[index];
				return (
					<div
						key={placement.id}
						data-modula-freeform-item={placement.id}
						data-modula-catalog-index={index}
						className={`modula-freeform__tile modula-item-tiled${editor ? ' react-grid-item' : ''}`}
						onPointerDown={(event) =>
							onTilePointerDown?.(event, placement)
						}
						onClickCapture={onTileClickCapture}
						style={{
							position: 'absolute',
							...rectangle,
							zIndex: placement.z + 1,
							overflow: 'hidden',
							boxSizing: 'border-box',
							touchAction:
								editor && device === 'desktop'
									? 'none'
									: undefined,
						}}
					>
						<GalleryItem
							itemData={items[index]}
							catalogIndex={index}
							config={config}
							slotWidth={rectangle.width}
							slotHeight={rectangle.height}
							fillSlot
							style={{ width: '100%', height: '100%' }}
						/>
						{tileControls?.(placement)}
					</div>
				);
			})}
			{children}
		</div>
	);
}

export default function FreeformLayout({ Surface = FreeformSurface }) {
	const items = useSelector((state) => state.items.items);
	const config = useSelector((state) => state.gallery.config);
	const { containerRef, containerWidth } = useContainerWidth(0);
	const ids = useMemo(() => freeformOccurrenceIds(items), [items]);
	const composition = useMemo(
		() => resolveFreeformComposition(ids, config.freeformPlacements, items),
		[ids, config.freeformPlacements, items]
	);
	const device =
		getForcedPreviewViewport(config) ||
		resolveResponsiveDeviceFromWidth(containerWidth, { config });
	const metrics = freeformMetrics(
		containerWidth,
		freeformDeviceGutter(config, device)
	);
	return (
		<div
			ref={containerRef}
			className="modula-freeform-host"
			style={{ width: '100%', minWidth: 0 }}
		>
			{containerWidth > 0 ? (
				<Surface
					items={items}
					config={config}
					composition={composition}
					metrics={metrics}
					device={device}
				/>
			) : null}
		</div>
	);
}
