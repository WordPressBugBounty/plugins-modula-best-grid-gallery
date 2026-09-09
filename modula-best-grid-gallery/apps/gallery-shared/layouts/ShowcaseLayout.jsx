/**
 * Showcase layout — infinite portfolio strip with smooth track translate.
 *
 * Renders three copies of the item list so prev/next animate continuously;
 * after the transition, the track snaps back to the middle copy.
 *
 * @package
 */

import { useCallback, useMemo, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { useSelector } from 'react-redux';
import { isEmbeddedGalleryItemRow } from '../utils/embeddedGalleryItemKinds';
import { getForcedPreviewViewport } from '../utils/resolvePreviewViewport';
import {
	computeShowcaseTranslateX,
	getShowcaseItemAspectRatio,
	resolveShowcaseActiveMarginX,
	resolveShowcaseTrackBoxes,
	resolveShowcaseTrackHeight,
} from './showcase/showcaseModel';
import { useShowcaseCarousel } from './showcase/useShowcaseCarousel';
import ShowcaseSlide from './showcase/ShowcaseSlide';

const MOBILE_MAX_PX = 768;
const DEFAULT_CENTER_SCALE = 1.4;
const DEFAULT_GAP = 32;

/*
 * Keep the carousel hook behind a member call so production minify does not
 * inline it into this component (inlining collided short names and broke
 * trackIndex / measuredAr — next/prev looked like a hard cut with no motion).
 */
const showcaseCarouselHooks = { useShowcaseCarousel };

export default function ShowcaseLayout() {
	const items = useSelector((s) => s.items.items);
	const config = useSelector((s) => s.gallery.config);
	const showcase = config?.showcase || {};
	const list = useMemo(() => {
		const raw = Array.isArray(items) ? items : [];
		return raw.filter(
			(row) => row && !isEmbeddedGalleryItemRow(row)
		);
	}, [items]);

	/** @type {[Record<string, number>, Function]} */
	const [measuredAr, setMeasuredAr] = useState({});

	const onSlideAspect = useCallback((key, ratio) => {
		if (!key || !Number.isFinite(ratio) || ratio <= 0) {
			return;
		}
		setMeasuredAr((prev) => {
			if (prev[key] && Math.abs(prev[key] - ratio) < 0.01) {
				return prev;
			}
			return { ...prev, [key]: ratio };
		});
	}, []);

	const infinite = list.length >= 2;
	const forcedViewport = getForcedPreviewViewport(config);
	const {
		trackIndex,
		setActiveIndex,
		goPrev,
		goNext,
		suppressTransition,
		onTransitionEnd,
		viewportRef,
		viewportWidth,
		dragOffset,
		isDragging,
		onPointerDown,
		onPointerMove,
		onPointerUp,
		didDragRef,
	} = showcaseCarouselHooks.useShowcaseCarousel({
		itemCount: list.length,
		autoplay: !!showcase.autoplay,
		autoplayInterval: showcase.autoplayInterval,
		enabled: list.length > 0,
		infinite,
	});

	const isMobile =
		forcedViewport === 'mobile' ||
		(forcedViewport !== 'desktop' &&
			forcedViewport !== 'tablet' &&
			viewportWidth > 0 &&
			viewportWidth <= MOBILE_MAX_PX);

	const mobileSimplify = showcase.mobileSimplify !== false;
	const simplify = isMobile && mobileSimplify;
	const visibleCount = simplify ? 1 : showcase.visibleCount || 3;
	const gap = Number.isFinite(showcase.gap) ? showcase.gap : DEFAULT_GAP;
	const rawCenterScale = Number(showcase.centerScale);
	const centerScale = simplify
		? 1
		: Number.isFinite(rawCenterScale) && rawCenterScale > 1
			? Math.max(1.1, rawCenterScale)
			: DEFAULT_CENTER_SCALE;
	const centerBias =
		list.length >= 2 || showcase.centerBias !== 'left' ? 'center' : 'left';
	const arrowPosition = showcase.arrowPosition || 'bottom-right';

	const slideKeys = useMemo(
		() =>
			list.map((item, index) =>
				String(
					item?.uuid ||
						item?.id ||
						item?.image_id ||
						`showcase-${index}`
				)
			),
		[list]
	);

	const aspectRatios = useMemo(
		() =>
			list.map((item, index) => {
				const key = slideKeys[index];
				if (key && measuredAr[key]) {
					return measuredAr[key];
				}
				return getShowcaseItemAspectRatio(item, config);
			}),
		[list, slideKeys, measuredAr, config]
	);

	const loopWindowSize = useMemo(() => {
		if (simplify || list.length <= 1) {
			return 1;
		}
		const requested = Math.max(3, Math.round(Number(visibleCount) || 3));
		return requested % 2 === 0 ? requested + 1 : requested;
	}, [simplify, list.length, visibleCount]);

	/*
	 * Height is stable for the gallery (worst-case window with scaled center),
	 * not the current active slide — avoids landscape↔portrait strip resize.
	 */
	const neighborHeight = resolveShowcaseTrackHeight({
		viewportWidth: viewportWidth || 960,
		gap,
		centerScale,
		mobile: simplify,
		aspectRatios,
		windowSize: loopWindowSize,
	});

	const copies = infinite ? 3 : 1;

	const { widths: slideWidths, heights: slideHeights } = useMemo(
		() =>
			resolveShowcaseTrackBoxes({
				aspectRatios,
				neighborHeight,
				copies,
			}),
		[aspectRatios, neighborHeight, copies]
	);

	const trackHeight = Math.round(neighborHeight * centerScale);

	const baseTranslate = computeShowcaseTranslateX({
		slideWidths,
		trackIndex,
		viewportWidth: viewportWidth || 960,
		gap,
		centerScale,
		centerBias,
	});
	const translateX = baseTranslate + (isDragging ? dragOffset : 0);
	const animateTransform = !isDragging && !suppressTransition;

	const rootClass = [
		'modula-items',
		'modula-showcase',
		infinite ? 'modula-showcase--infinite' : '',
		`modula-showcase--arrows-${arrowPosition}`,
		simplify ? 'modula-showcase--mobile' : '',
		isDragging ? 'is-dragging' : '',
		suppressTransition ? 'is-loop-snap' : '',
	]
		.filter(Boolean)
		.join(' ');

	const trackNodes = useMemo(() => {
		/** @type {{ item: object, sourceIndex: number, copy: number, trackI: number, key: string }[]} */
		const nodes = [];
		for (let c = 0; c < copies; c++) {
			for (let i = 0; i < list.length; i++) {
				nodes.push({
					item: list[i],
					sourceIndex: i,
					copy: c,
					trackI: c * list.length + i,
					key: `${c}:${slideKeys[i]}`,
				});
			}
		}
		return nodes;
	}, [copies, list, slideKeys]);

	return (
		<div
			className={rootClass}
			style={{
				'--modula-showcase-gap': `${gap}px`,
				'--modula-showcase-center-scale': String(centerScale),
			}}
		>
			<div
				ref={viewportRef}
				className="modula-showcase__viewport"
				tabIndex={0}
				role="region"
				aria-roledescription="carousel"
				aria-label={__('Showcase gallery', 'modula-best-grid-gallery')}
				onPointerDown={onPointerDown}
				onPointerMove={onPointerMove}
				onPointerUp={onPointerUp}
				onPointerCancel={onPointerUp}
				onClickCapture={(e) => {
					if (didDragRef.current?.moved) {
						e.preventDefault();
						e.stopPropagation();
						didDragRef.current.moved = false;
					}
				}}
			>
				<div
					className="modula-showcase__track"
					style={{
						height: `${Math.round(trackHeight)}px`,
						transform: `translate3d(${translateX}px, 0, 0)`,
						transition: animateTransform
							? 'transform 0.45s cubic-bezier(0.22, 1, 0.36, 1)'
							: 'none',
					}}
					onTransitionEnd={(e) => {
						if (e.target !== e.currentTarget) {
							return;
						}
						if (e.propertyName && e.propertyName !== 'transform') {
							return;
						}
						onTransitionEnd();
					}}
				>
					{trackNodes.map((node) => {
						const dist = Math.abs(node.trackI - trackIndex);
						const isActive = node.trackI === trackIndex;
						const w = slideWidths[node.trackI] || 0;
						const marginX = isActive
							? resolveShowcaseActiveMarginX(w, centerScale)
							: 0;
						/*
						 * Keep the middle clone eager so the infinite snap does
						 * not flash unloaded images when teleporting.
						 */
						const inMiddleCopy =
							infinite &&
							node.trackI >= list.length &&
							node.trackI < list.length * 2;
						return (
							<ShowcaseSlide
								key={node.key}
								itemKey={slideKeys[node.sourceIndex]}
								itemData={node.item}
								config={config}
								width={w}
								height={slideHeights[node.trackI]}
								marginX={marginX}
								isActive={isActive}
								lazy={!inMiddleCopy && dist > 2}
								onAspectRatio={onSlideAspect}
								onSelect={() => {
									if (didDragRef.current?.moved) {
										return;
									}
									setActiveIndex(node.sourceIndex);
								}}
							/>
						);
					})}
				</div>
			</div>
			{list.length > 1 ? (
				<div className="modula-showcase__arrows" role="group">
					<button
						type="button"
						className="modula-showcase__arrow modula-showcase__arrow--prev"
						onClick={goPrev}
						aria-label={__(
							'Previous photo',
							'modula-best-grid-gallery'
						)}
					>
						<svg
							className="modula-showcase__arrow-icon"
							width="14"
							height="14"
							viewBox="0 0 14 14"
							aria-hidden="true"
							focusable="false"
						>
							<path
								d="M9.2 2.2 4.4 7l4.8 4.8"
								fill="none"
								stroke="currentColor"
								strokeWidth="1.6"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</svg>
					</button>
					<button
						type="button"
						className="modula-showcase__arrow modula-showcase__arrow--next"
						onClick={goNext}
						aria-label={__(
							'Next photo',
							'modula-best-grid-gallery'
						)}
					>
						<svg
							className="modula-showcase__arrow-icon"
							width="14"
							height="14"
							viewBox="0 0 14 14"
							aria-hidden="true"
							focusable="false"
						>
							<path
								d="M4.8 2.2 9.6 7l-4.8 4.8"
								fill="none"
								stroke="currentColor"
								strokeWidth="1.6"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</svg>
					</button>
				</div>
			) : null}
		</div>
	);
}
