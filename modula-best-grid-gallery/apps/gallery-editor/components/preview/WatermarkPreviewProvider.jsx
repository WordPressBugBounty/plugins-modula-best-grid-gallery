/**
 * Canvas watermark preview: draws the mark Apply would burn in on each image
 * tile Apply would burn now (not yet watermarked, inside "Applies to", not
 * just restored by Remove), live with the Watermark settings. Editor only:
 * the overlay is the gallery editor's tile chrome (GalleryItemChromeContext),
 * which visitor galleries never provide.
 *
 * The mark is laid out in the original's pixels (watermarkPreviewGeometry)
 * and an SVG maps that frame onto the tile's image, through the size
 * WordPress served and the tile's object-fit.
 *
 * @package
 */

import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from '@wordpress/element';
import { GalleryItemChromeContext } from 'gallery-shared/context/GalleryItemChromeContext';
import { isVideoGalleryItem } from 'gallery-shared/video/videoGalleryModel';
import { useWatermarkRegistration } from '../../hooks/useWatermarkRegistration';
import { useModulaSettingsEditorConfig } from '../../hooks/useModulaSettingsEditorConfig';
import { usePreviewReduxStoreItems } from '../../hooks/usePreviewReduxStoreItems';
import { useWpMediaAttachmentQuery } from '../../query/useWpMediaAttachmentQuery';
import { useWatermarkPreviewSelection } from '../../context/WatermarkPreviewSelectionContext';
import {
	NO_RESTORED_IDS,
	diffWatermarkApplied,
	isWatermarkPreviewTarget,
} from '../../logic/watermarkPreviewTargets';
import {
	WATERMARK_PREVIEW_FONT_FAMILY,
	imageContentRect,
	layoutImageWatermark,
	layoutTextWatermark,
	resolveWatermarkPreviewMark,
	sourceFrameRect,
} from '../../utils/watermarkPreviewGeometry';

/**
 * @typedef {import('../../utils/watermarkPreviewGeometry').WatermarkPreviewMark} WatermarkPreviewMark
 * @typedef {import('../../utils/watermarkPreviewGeometry').WatermarkInkMetrics} WatermarkInkMetrics
 * @typedef {{width: number, height: number}} Size
 * @typedef {{left: number, top: number, width: number, height: number}} Rect
 */

/**
 * @typedef {Object} WatermarkPreviewValue
 * @property {WatermarkPreviewMark}                              mark     The mark Apply would burn.
 * @property {{url: string, width: number, height: number}|null} markFile Image type: the mark's file; null until loaded.
 */

/** @type {import('react').Context<WatermarkPreviewValue|null>} */
const WatermarkPreviewContext = createContext(null);

const OVERLAY_STYLE = {
	position: 'absolute',
	inset: 0,
	overflow: 'hidden',
	pointerEvents: 'none',
	borderRadius: 'inherit',
};

/** @type {CanvasRenderingContext2D|null|undefined} */
let measureContext;

/**
 * Ink extents of a string in Pro's font stack (GD measures ink, not line boxes).
 *
 * @param {string} text       The mark's text.
 * @param {number} fontSizePx Font size (em px).
 * @return {WatermarkInkMetrics} Ink extents around the pen origin.
 */
function measureInk(text, fontSizePx) {
	if (measureContext === undefined) {
		measureContext = document.createElement('canvas').getContext('2d');
	}
	if (!measureContext) {
		return { left: 0, right: 0, ascent: fontSizePx, descent: 0 };
	}
	measureContext.font = `${fontSizePx}px ${WATERMARK_PREVIEW_FONT_FAMILY}`;
	const metrics = measureContext.measureText(text);
	return {
		left: metrics.actualBoundingBoxLeft,
		right: metrics.actualBoundingBoxRight,
		ascent: metrics.actualBoundingBoxAscent,
		descent: metrics.actualBoundingBoxDescent,
	};
}

/**
 * @param {unknown} size `watermarkSourceSize` from the editor bootstrap.
 * @return {Size|null} The original's size; null when unknown.
 */
function readSourceSize(size) {
	const width = Number(size?.width);
	const height = Number(size?.height);
	return width > 0 && height > 0 ? { width, height } : null;
}

/**
 * @param {Rect} a
 * @param {Rect} b
 * @return {boolean} Whether the rects match to half a px.
 */
function sameRect(a, b) {
	return (
		Math.abs(a.left - b.left) < 0.5 &&
		Math.abs(a.top - b.top) < 0.5 &&
		Math.abs(a.width - b.width) < 0.5 &&
		Math.abs(a.height - b.height) < 0.5
	);
}

/**
 * Where the tile's image draws the original, in the overlay's px.
 *
 * Follows the image through layout changes, its (lazy) mount and its load.
 * Rects come from getBoundingClientRect, scaled back by the overlay's own
 * ratio, so a scaled canvas stays aligned.
 *
 * @param {import('react').RefObject<HTMLElement>} overlayRef The overlay, a sibling of the tile's media.
 * @param {Size|null}                              sourceSize Original size; null uses the served file's.
 * @return {{frame: Rect, source: Size}|null} The original's rect and size; null until the image has loaded.
 */
function useSourceFrame(overlayRef, sourceSize) {
	const [placement, setPlacement] = useState(null);
	const sourceWidth = sourceSize?.width ?? 0;
	const sourceHeight = sourceSize?.height ?? 0;

	const measure = useCallback(() => {
		const overlay = overlayRef.current;
		const img = overlay?.parentElement?.querySelector('picture img');
		if (!overlay || !img || !(img.naturalWidth > 0)) {
			setPlacement(null);
			return;
		}
		const overlayRect = overlay.getBoundingClientRect();
		const imgRect = img.getBoundingClientRect();
		const scale =
			overlayRect.width > 0 ? overlay.offsetWidth / overlayRect.width : 1;
		const style = window.getComputedStyle(img);
		const content = imageContentRect({
			boxWidth: imgRect.width * scale,
			boxHeight: imgRect.height * scale,
			naturalWidth: img.naturalWidth,
			naturalHeight: img.naturalHeight,
			objectFit: style.objectFit,
			objectPosition: style.objectPosition,
		});
		content.left += (imgRect.left - overlayRect.left) * scale;
		content.top += (imgRect.top - overlayRect.top) * scale;
		const natural = { width: img.naturalWidth, height: img.naturalHeight };
		const source =
			sourceWidth > 0
				? { width: sourceWidth, height: sourceHeight }
				: natural;
		const frame = sourceFrameRect(content, natural, source);
		setPlacement((prev) =>
			prev &&
			prev.source.width === source.width &&
			prev.source.height === source.height &&
			sameRect(prev.frame, frame)
				? prev
				: { frame, source }
		);
	}, [overlayRef, sourceWidth, sourceHeight]);

	useLayoutEffect(() => {
		const overlay = overlayRef.current;
		const host = overlay?.parentElement;
		if (!host) {
			return undefined;
		}
		measure();
		const resize = new ResizeObserver(measure);
		resize.observe(host);
		// The picture mounts late (lazy gate) and its img loads later still.
		const mutations = new MutationObserver(measure);
		mutations.observe(host, {
			childList: true,
			subtree: true,
			attributes: true,
			attributeFilter: ['src', 'srcset', 'style', 'class'],
		});
		host.addEventListener('load', measure, true);
		return () => {
			resize.disconnect();
			mutations.disconnect();
			host.removeEventListener('load', measure, true);
		};
	}, [overlayRef, measure]);

	return placement;
}

/**
 * @param {{mark: WatermarkPreviewMark, source: Size}} props A text mark and the original's size.
 */
function TextMark({ mark, source }) {
	const layout = useMemo(
		() =>
			layoutTextWatermark(mark, source, (fontSize) =>
				measureInk(mark.text, fontSize)
			),
		[mark, source]
	);
	return (
		<text
			x={layout.x}
			y={layout.y}
			fontSize={layout.fontSize}
			fontFamily={WATERMARK_PREVIEW_FONT_FAMILY}
			fill={mark.color}
			fillOpacity={mark.opacity}
			style={{ whiteSpace: 'pre' }}
		>
			{mark.text}
		</text>
	);
}

/**
 * @param {{mark: WatermarkPreviewMark, markFile: NonNullable<WatermarkPreviewValue['markFile']>, source: Size}} props An image mark, its file and the original's size.
 */
function ImageMark({ mark, markFile, source }) {
	const box = layoutImageWatermark(mark, source, markFile);
	return (
		<image
			href={markFile.url}
			x={box.x}
			y={box.y}
			width={box.width}
			height={box.height}
			opacity={mark.opacity}
			preserveAspectRatio="none"
		/>
	);
}

/**
 * @param {{ itemData: Object }} props
 */
function WatermarkPreviewOverlay({ itemData }) {
	const preview = useContext(WatermarkPreviewContext);
	const overlayRef = useRef(null);
	const sourceSize = useMemo(
		() => readSourceSize(itemData?.watermarkSourceSize),
		[itemData?.watermarkSourceSize]
	);
	const placement = useSourceFrame(overlayRef, sourceSize);

	const mark = preview?.mark ?? null;
	const markFile = preview?.markFile ?? null;
	const canDraw =
		mark !== null && (mark.type === 'text' || markFile !== null);

	return (
		<div
			ref={overlayRef}
			className="modula-watermark-preview"
			style={OVERLAY_STYLE}
			aria-hidden="true"
		>
			{canDraw && placement ? (
				<svg
					viewBox={`0 0 ${placement.source.width} ${placement.source.height}`}
					preserveAspectRatio="none"
					style={{
						position: 'absolute',
						left: placement.frame.left,
						top: placement.frame.top,
						width: placement.frame.width,
						height: placement.frame.height,
						overflow: 'hidden',
					}}
				>
					{mark.type === 'text' ? (
						<TextMark mark={mark} source={placement.source} />
					) : (
						<ImageMark
							mark={mark}
							markFile={markFile}
							source={placement.source}
						/>
					)}
				</svg>
			) : null}
		</div>
	);
}

/**
 * Images Remove restored while the mark stayed the same. They stay clean on
 * the canvas until a watermark setting changes; drawing the preview right
 * after Remove reads as a mark that was not removed.
 *
 * @param {string}  markKey The mark's settings and Apply's scope, serialized.
 * @param {boolean} enabled Whether a mark is previewed at all.
 * @return {ReadonlySet<number>} Restored attachment IDs.
 */
function useRestoredIds(markKey, enabled) {
	const items = usePreviewReduxStoreItems(enabled);
	const appliedRef = useRef(new Map());
	const [restored, setRestored] = useState(() => ({
		markKey,
		ids: NO_RESTORED_IDS,
	}));

	// A settings change starts a new preview: adjust the state while rendering.
	if (restored.markKey !== markKey) {
		setRestored({ markKey, ids: NO_RESTORED_IDS });
	}

	// The preview store is external; follow its watermarkApplied flags.
	useEffect(() => {
		const { applied, restoredIds } = diffWatermarkApplied(
			appliedRef.current,
			items
		);
		appliedRef.current = applied;
		if (restoredIds.length === 0) {
			return;
		}
		setRestored((current) => ({
			markKey: current.markKey,
			ids: new Set([...current.ids, ...restoredIds]),
		}));
	}, [items]);

	return restored.markKey === markKey ? restored.ids : NO_RESTORED_IDS;
}

/**
 * Tile chrome renderer: only the images Apply would burn now.
 *
 * @param {WatermarkPreviewMark|null} mark The mark Apply would burn.
 * @return {((itemData: Object) => import('react').ReactNode)|null} Null without a mark.
 */
function useWatermarkPreviewRenderer(mark) {
	const selection = useWatermarkPreviewSelection();
	const scope = selection?.scope ?? 'all';
	const isSelected = selection?.isSelected;
	const markKey = useMemo(() => JSON.stringify([mark, scope]), [mark, scope]);
	const restoredIds = useRestoredIds(markKey, mark !== null);

	return useMemo(() => {
		if (mark === null) {
			return null;
		}
		const target = {
			scope,
			isSelected: isSelected ?? (() => false),
			restoredIds,
		};
		return (itemData) =>
			isWatermarkPreviewTarget(itemData, target) &&
			!isVideoGalleryItem(itemData) ? (
				<WatermarkPreviewOverlay itemData={itemData} />
			) : null;
	}, [mark, scope, isSelected, restoredIds]);
}

/**
 * The mark's file as Pro reads it (`get_attached_file()`: the full size).
 *
 * @param {number} imageId Attachment ID; 0 for none.
 * @return {{url: string, width: number, height: number}|null} Null until loaded.
 */
function useMarkFile(imageId) {
	const { data: media } = useWpMediaAttachmentQuery(imageId, {
		enabled: imageId > 0,
	});
	return useMemo(() => {
		const url =
			typeof media?.source_url === 'string' ? media.source_url : '';
		const width = Number(media?.media_details?.width);
		const height = Number(media?.media_details?.height);
		return url !== '' && width > 0 && height > 0
			? { url, width, height }
			: null;
	}, [media]);
}

/**
 * Draws the watermark preview on the canvas tiles inside it, while Pro's
 * watermark extension is active and the settings would burn a mark.
 *
 * @param {{ watermarkSettings: Record<string, unknown>|undefined, children: import('react').ReactNode }} props
 */
export function WatermarkPreviewProvider({ watermarkSettings, children }) {
	const registration = useWatermarkRegistration();
	const editorConfig = useModulaSettingsEditorConfig();
	const mark = useMemo(
		() =>
			registration
				? resolveWatermarkPreviewMark(
						watermarkSettings,
						editorConfig?.watermarkGlobal
					)
				: null,
		[registration, watermarkSettings, editorConfig]
	);
	const markFile = useMarkFile(mark?.type === 'image' ? mark.imageId : 0);
	const value = useMemo(
		() => (mark ? { mark, markFile } : null),
		[mark, markFile]
	);
	const renderPreview = useWatermarkPreviewRenderer(mark);

	return (
		<WatermarkPreviewContext.Provider value={value}>
			<GalleryItemChromeContext.Provider value={renderPreview}>
				{children}
			</GalleryItemChromeContext.Provider>
		</WatermarkPreviewContext.Provider>
	);
}
