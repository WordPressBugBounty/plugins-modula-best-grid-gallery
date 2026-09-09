/**
 * Modula Gallery - Slider layout (Fancyapps Carousel, align with Modula Pro)
 *
 * Thumbnail strip (@see https://fancyapps.com/carousel/plugins/thumbs/):
 * - Visible thumbnails > 0 → classic + Sync, paged N-at-a-time.
 * - Otherwise `modern` when slides to show/scroll are both 1; classic Sync for multi-tile.
 *
 * @package
 */

import './fancyappsCarouselStyles';
import { useEffect, useMemo, useRef } from '@wordpress/element';
import { useSelector } from 'react-redux';
import { Carousel, Autoplay, Arrows, Lazyload, Thumbs } from '@fancyapps/ui';
import { Dots } from '@fancyapps/ui/dist/carousel/carousel.dots.js';
import SliderItem from '../components/SliderItem';
import { galleryItemRowKey } from '../utils/galleryItemIdentity';
import { resolveSliderNavigationStep } from '../utils/sliderSettingsToCarousel';
import {
	applyReducedMotionToCarouselOptions,
	shouldSuppressGalleryMotion,
} from '../utils/reducedMotion';

/**
 * Refresh per-slide offsets (Carousel internal J list) before reading .offset.
 *
 * @param {*} api - Fancyapps Carousel instance.
 */
function refreshCarouselSlideMetrics(api) {
	const pos = api.getPosition?.();
	if (typeof pos === 'number' && Number.isFinite(pos)) {
		api.getVisibleSlides(pos);
	} else {
		api.getVisibleSlides();
	}
}

/**
 * Animate track position when pages are merged (no Thumbs Sync to keep in sync).
 *
 * @param {*}      api       - Fancyapps Carousel instance.
 * @param {number} targetPos - Track position k.
 * @param {{ instant?: boolean }} [opts]
 */
function tweenCarouselToPosition(api, targetPos, opts = {}) {
	const from = api.getPosition();
	if (Math.abs(targetPos - from) < 0.5) {
		return;
	}
	if (opts.instant && typeof api.setPosition === 'function') {
		api.setPosition(targetPos);
		return;
	}
	const tw = api.getTween?.();
	const carouselOpts = api.getOptions?.() || {};
	if (tw && typeof tw.spring === 'function') {
		tw.pause?.();
		tw.spring({ ...carouselOpts.tween })
			.from({ pos: from })
			.to({ pos: targetPos })
			.start?.();
	} else if (typeof api.setPosition === 'function') {
		api.setPosition(targetPos);
	}
}

export default function SliderLayout() {
	const items = useSelector((state) => state.items.items);
	const config = useSelector((state) => state.gallery.config);
	const metadata = useSelector((state) => state.gallery.metadata);
	const itemsRef = useRef(null);
	const suppressMotion = shouldSuppressGalleryMotion(config, metadata);

	const { carouselOptions, useAutoplayPlugin, useThumbsPlugin, navSteps } =
		useMemo(() => {
			const sc = config?.sliderCarousel;
			let options = sc?.carouselOptions || {};
			let autoplay = !!sc?.useAutoplayPlugin;
			if (suppressMotion) {
				options = applyReducedMotionToCarouselOptions(options);
				autoplay = false;
			}
			return {
				carouselOptions: options,
				useAutoplayPlugin: autoplay,
				useThumbsPlugin: !!sc?.useThumbsPlugin,
				navSteps: {
					desktop: Math.max(
						0,
						parseInt(sc?.navigationSteps?.desktop ?? 0, 10) || 0
					),
					tablet: Math.max(
						0,
						parseInt(
							sc?.navigationSteps?.tablet ??
								sc?.navigationStepBySlide ??
								0,
							10
						) || 0
					),
					mobile: Math.max(
						0,
						parseInt(
							sc?.navigationSteps?.mobile ??
								sc?.navigationStepBySlide ??
								0,
							10
						) || 0
					),
					fallback: Math.max(
						0,
						parseInt(sc?.navigationStepBySlide ?? 0, 10) || 0
					),
				},
			};
		}, [config.sliderCarousel, suppressMotion]);

	const optionsSignature = useMemo(
		() => JSON.stringify(carouselOptions),
		[carouselOptions]
	);

	/**
	 * Fancy Carousel rewires the DOM under `.modula-items`; React must not reconcile
	 * slide order in place. Remount the root when item order/ids change (e.g. admin reorder).
	 */
	/** Include index so duplicate attachment IDs and permutations remount Fancy Carousel reliably. */
	const carouselItemsMountKey = useMemo(
		() =>
			Array.isArray(items)
				? items
						.map((it, i) => `${i}:${galleryItemRowKey(it, i)}`)
						.join('|')
				: '',
		[items]
	);

	useEffect(() => {
		const mainEl = itemsRef.current;
		if (!mainEl || !Array.isArray(items) || items.length === 0) {
			return undefined;
		}

		const plugins = {
			Arrows,
			Dots,
		};
		if (carouselOptions.Lazyload) {
			plugins.Lazyload = Lazyload;
		}
		if (useAutoplayPlugin) {
			plugins.Autoplay = Autoplay;
		}
		if (useThumbsPlugin) {
			plugins.Thumbs = Thumbs;
		}

		const mainInstance = Carousel(mainEl, carouselOptions, plugins).init();

		/** Bind once per instance so refresh can re-wrap without chaining patches. */
		const nativeNext = mainInstance.next.bind(mainInstance);
		const nativePrev = mainInstance.prev.bind(mainInstance);

		const currentNavStep = () =>
			resolveSliderNavigationStep(
				navSteps,
				navSteps.fallback,
				config?.previewViewport
			);

		/**
		 * When slidesToScroll differs from the native page size, step by slide count.
		 * With Thumbs classic Sync, always use goTo so `change` keeps the strip aligned.
		 * Step follows tablet/mobile scrolls via matchMedia (or editor previewViewport).
		 */
		function patchStepNavigation() {
			const navStep = currentNavStep();
			if (navStep <= 0) {
				mainInstance.next = nativeNext;
				mainInstance.prev = nativePrev;
				return;
			}
			const slides = mainInstance.getSlides();
			const slideCount = slides.length;
			if (slideCount < 2) {
				mainInstance.next = nativeNext;
				mainInstance.prev = nativePrev;
				return;
			}
			const goBy = (delta) => {
				const inDelta = delta;
				refreshCarouselSlideMetrics(mainInstance);
				const page = mainInstance.getPage();
				let visible = mainInstance.getVisibleSlides(
					mainInstance.getPosition?.()
				);
				if (!Array.isArray(visible) || visible.length === 0) {
					visible = mainInstance.getVisibleSlides();
				}
				let cur = page?.slides?.[0]?.index ?? 0;
				if (Array.isArray(visible) && visible.length > 0) {
					const visIdx = visible.map((s) => s.index);
					cur = Math.min(...visIdx);
				}
				const nextIdx = Math.min(
					Math.max(cur + inDelta, 0),
					slideCount - 1
				);
				if (nextIdx === cur) {
					(inDelta > 0 ? nativeNext : nativePrev)();
					return;
				}

				const pTarget = mainInstance.getPageIndex(nextIdx);
				const pCur = mainInstance.getPageIndex();
				if (pTarget >= 0 && pTarget !== pCur) {
					mainInstance.goTo(
						pTarget,
						suppressMotion
							? { transition: false }
							: { transition: 'tween' }
					);
					return;
				}

				/* No Thumbs: offset tween for merged multi-tile pages. */
				if (useThumbsPlugin) {
					(inDelta > 0 ? nativeNext : nativePrev)();
					return;
				}

				refreshCarouselSlideMetrics(mainInstance);
				const curSlide = slides[cur];
				const tgtSlide = slides[nextIdx];
				if (
					curSlide &&
					tgtSlide &&
					!curSlide.isVirtual &&
					!tgtSlide.isVirtual &&
					Number.isFinite(curSlide.offset) &&
					Number.isFinite(tgtSlide.offset)
				) {
					let deltaPos = tgtSlide.offset - curSlide.offset;
					if (mainInstance.isRTL?.()) {
						deltaPos = -deltaPos;
					}
					if (Math.abs(deltaPos) > 0.5) {
						let newK = mainInstance.getPosition() + deltaPos;
						const pages = mainInstance.getPages?.() || [];
						if (pages.length > 0) {
							const minP = pages[0].pos;
							const maxP = pages[pages.length - 1].pos;
							newK = Math.max(minP, Math.min(maxP, newK));
						}
						tweenCarouselToPosition(mainInstance, newK, {
							instant: suppressMotion,
						});
						return;
					}
				}
				(inDelta > 0 ? nativeNext : nativePrev)();
			};
			mainInstance.next = () => {
				goBy(currentNavStep());
				return mainInstance;
			};
			mainInstance.prev = () => {
				goBy(-currentNavStep());
				return mainInstance;
			};
		}

		patchStepNavigation();
		mainInstance.on('refresh', patchStepNavigation);

		/**
		 * Adaptive height measures slide lastElementChild; image slides remasure on
		 * load, but embedded content/shortcodes do not — observe size and refresh.
		 */
		const adaptiveHeight = !!config?.sliderCarousel?.adaptiveHeight;
		let embeddedResizeRaf = 0;
		/** @type {ResizeObserver|null} */
		let embeddedResizeObserver = null;
		if (adaptiveHeight && typeof ResizeObserver !== 'undefined') {
			const scheduleEmbeddedRemeasure = () => {
				if (embeddedResizeRaf) {
					return;
				}
				embeddedResizeRaf = requestAnimationFrame(() => {
					embeddedResizeRaf = 0;
					refreshCarouselSlideMetrics(mainInstance);
				});
			};
			embeddedResizeObserver = new ResizeObserver(
				scheduleEmbeddedRemeasure
			);
			mainEl
				.querySelectorAll('.modula-item--embedded')
				.forEach((el) => embeddedResizeObserver.observe(el));
			scheduleEmbeddedRemeasure();
		}

		return () => {
			if (embeddedResizeRaf) {
				cancelAnimationFrame(embeddedResizeRaf);
			}
			embeddedResizeObserver?.disconnect();
			mainInstance.destroy();
		};
	}, [
		items,
		optionsSignature,
		useAutoplayPlugin,
		useThumbsPlugin,
		navSteps,
		carouselOptions,
		config?.previewViewport,
		config?.sliderCarousel?.adaptiveHeight,
		suppressMotion,
	]);

	const sliderAdaptiveHeight = !!config?.sliderCarousel?.adaptiveHeight;
	const slideAspectRatio = config?.sliderCarousel?.slideAspectRatio;
	const thumbsStripStyle = config?.sliderCarousel?.thumbsStripStyle;
	const thumbsEqualSlots = Boolean(config?.sliderCarousel?.thumbsEqualSlots);
	const thumbsPaged = Boolean(config?.sliderCarousel?.thumbsPaged);
	const sliderFillCrop = Boolean(config?.sliderFillCrop);
	const arrowsEnabled = Boolean(config?.sliderCarousel?.arrowsEnabled);
	const arrowsInside = Boolean(config?.sliderCarousel?.arrowsInside);
	const sliderShellStyle = {
		...(!sliderAdaptiveHeight && slideAspectRatio
			? { '--modula-slider-slide-aspect': slideAspectRatio }
			: undefined),
		...(thumbsStripStyle && typeof thumbsStripStyle === 'object'
			? thumbsStripStyle
			: undefined),
	};

	return (
		<div
			className={[
				'modula-slider',
				sliderAdaptiveHeight
					? 'modula-slider--adaptive-height'
					: 'modula-slider--fixed-height',
				sliderFillCrop
					? 'modula-slider--fill-crop'
					: 'modula-slider--scale-down',
				arrowsEnabled && arrowsInside
					? 'modula-slider--arrows-inside'
					: '',
				arrowsEnabled && !arrowsInside
					? 'modula-slider--arrows-outside'
					: '',
				thumbsEqualSlots ? 'modula-slider--thumbs-equal-slots' : '',
				thumbsPaged ? 'modula-slider--thumbs-paged' : '',
			]
				.filter(Boolean)
				.join(' ')}
			style={sliderShellStyle}
		>
			<div
				className="modula-items"
				ref={itemsRef}
				key={carouselItemsMountKey}
			>
				{Array.isArray(items) &&
					items.map((item, idx) => (
						<SliderItem
							key={`slide-${idx}-${String(item?.id ?? '')}`}
							itemData={item}
							config={config}
						/>
					))}
			</div>
		</div>
	);
}
