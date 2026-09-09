/**
 * Map grouped v2 settings to Fancyapps Carousel options (align with Modula Pro js_slider_config).
 * Uses @fancyapps/ui v6 option names (e.g. slidesPerPage, initialPage).
 * Thumbnail strip: Fancyapps Thumbs plugin (not a second Sync carousel).
 *
 * @package
 */

/**
 * CSS width for each slide so N slides fit in the viewport (see .f-carousel__slide width).
 *
 * @param {number} n - slidesToShow (visible count).
 * @return {string}
 */
function carouselSlideWidthVar(n) {
	if (n <= 1) {
		return '100%';
	}
	return `calc((100% - var(--f-carousel-gap, 0px) * (${n} - 1)) / ${n})`;
}

/**
 * First horizontal padding value in px (Slick centerPadding is often "50px" or "0 50px").
 *
 * @param {unknown} raw
 * @return {number}
 */
function parseCenterPaddingPx(raw) {
	if (raw === undefined || raw === null) {
		return 0;
	}
	if (typeof raw === 'number' && Number.isFinite(raw)) {
		return Math.max(0, raw);
	}
	const s = String(raw).trim();
	if (s === '') {
		return 0;
	}
	const matches = s.match(/\d+(?:\.\d+)?px/gi);
	if (matches && matches.length) {
		return Math.max(
			0,
			parseFloat(matches[matches.length - 1].replace(/px/i, '')) || 0
		);
	}
	const n = parseInt(s, 10);
	return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * Pro parity (class-enqueue.php): center mode narrows tiles so neighbors peek.
 * Non-center uses equal flex + --f-carousel-gap.
 *
 * @param {number} n
 * @param {boolean} centerMode
 * @param {unknown} centerPaddingRaw
 * @param {number} gutterPx
 * @return {string}
 */
function carouselSlideWidthForRow(n, centerMode, centerPaddingRaw, gutterPx) {
	const g = Math.max(0, gutterPx);
	/**
	 * Single “main” slide + center: Slick shows neighbors by narrowing each cell
	 * (not by padding inside the slide — that only adds empty bands). Peek on each
	 * side ≈ centerPadding; if unset, use a sensible default.
	 */
	if (n <= 1) {
		if (!centerMode) {
			return '100%';
		}
		let pad = parseCenterPaddingPx(centerPaddingRaw);
		if (pad <= 0) {
			pad = 50;
		}
		return `calc(100% - ${2 * pad}px - ${g}px * 2)`;
	}
	if (centerMode) {
		const pad = parseCenterPaddingPx(centerPaddingRaw);
		return `calc((100% / ${n}) - ${pad}px - ${g}px * (${n} + 1))`;
	}
	return carouselSlideWidthVar(n);
}

/** Fancyapps modern defaults (carousel.thumbs.css). */
const FANCYBOX_MODERN_CLIP_PX = 46;
const FANCYBOX_MODERN_HEIGHT_PX = 76;

/** Fallback when WP size catalog is missing (matches common Media Settings defaults). */
const WP_SIZE_FALLBACK_PX = {
	thumbnail: { width: 150, height: 150 },
	medium: { width: 300, height: 300 },
	medium_large: { width: 768, height: 0 },
	large: { width: 1024, height: 1024 },
};

/**
 * @param {unknown} catalog
 * @return {Record<string, { width: number, height: number }>}
 */
function normalizeImageSizeDimensionsCatalog(catalog) {
	if (!catalog || typeof catalog !== 'object' || Array.isArray(catalog)) {
		return {};
	}
	/** @type {Record<string, { width: number, height: number }>} */
	const out = {};
	for (const [key, raw] of Object.entries(catalog)) {
		if (!raw || typeof raw !== 'object') {
			continue;
		}
		const width = parseInt(raw.width ?? 0, 10);
		const height = parseInt(raw.height ?? 0, 10);
		if (!Number.isFinite(width) || width <= 0) {
			continue;
		}
		out[key] = {
			width,
			height: Number.isFinite(height) && height > 0 ? height : 0,
		};
	}
	return out;
}

/**
 * Pixel size for the thumbs strip when nav size is Custom or a registered WP size.
 *
 * @param {string} navSize
 * @param {Object} slider
 * @param {Record<string, { width: number, height: number }>} catalog
 * @return {{ width: number, height: number }|null}
 */
function resolveNavThumbPixelSize(navSize, slider, catalog) {
	if (navSize === 'custom') {
		const width = parseInt(
			slider.syncingNavImageDimensions?.width ?? 0,
			10
		);
		const height = parseInt(
			slider.syncingNavImageDimensions?.height ?? 0,
			10
		);
		if (!Number.isFinite(width) || width <= 0) {
			return null;
		}
		return {
			width,
			height:
				Number.isFinite(height) && height > 0
					? height
					: Math.max(1, Math.round((width * 9) / 16)),
		};
	}
	if (navSize === '' || navSize === 'auto' || navSize === 'full') {
		return null;
	}
	const fromCatalog = catalog[navSize];
	if (fromCatalog?.width > 0) {
		return {
			width: fromCatalog.width,
			height:
				fromCatalog.height > 0
					? fromCatalog.height
					: Math.max(1, Math.round((fromCatalog.width * 9) / 16)),
		};
	}
	const fallback = WP_SIZE_FALLBACK_PX[navSize];
	if (fallback?.width > 0) {
		return {
			width: fallback.width,
			height:
				fallback.height > 0
					? fallback.height
					: Math.max(1, Math.round((fallback.width * 9) / 16)),
		};
	}
	return {
		width: FANCYBOX_MODERN_CLIP_PX,
		height: FANCYBOX_MODERN_HEIGHT_PX,
	};
}

/**
 * Visible-thumbnails count + Thumbnail image size → Fancyapps Thumbs CSS vars.
 *
 * - visible 0: uncapped default strip (`modern` chrome when layout says so).
 * - visible N > 0: Fancyapps **classic** thumbs = second Carousel + Sync, viewport
 *   sized to N slots so Sync advances by thumb-page
 *   (@see https://fancyapps.com/carousel/plugins/thumbs/).
 *
 * @param {unknown} rawVisible
 * @param {number} gutterPx
 * @param {Object} slider
 * @param {Record<string, { width: number, height: number }>} [imageSizeDimensions]
 * @return {{
 *   type?: 'classic'|'modern',
 *   style: Record<string, string>,
 *   carousel?: Object,
 *   equalSlots?: boolean,
 *   paged?: boolean,
 * }|null}
 */
function buildSliderThumbsStripLayout(
	rawVisible,
	gutterPx,
	slider,
	imageSizeDimensions = {}
) {
	const parsed = parseInt(rawVisible ?? 0, 10);
	const hasVisibleLimit = Number.isFinite(parsed) && parsed > 0;
	const visible = hasVisibleLimit ? Math.min(20, parsed) : 0;
	const gutter = Math.max(0, gutterPx);
	const navSize =
		typeof slider.syncingNavSize === 'string'
			? slider.syncingNavSize.trim()
			: 'auto';
	const center = hasVisibleLimit ? visible % 2 !== 0 : true;
	const isAutoNav = navSize === '' || navSize === 'auto';
	const catalog = normalizeImageSizeDimensionsCatalog(imageSizeDimensions);

	/** @type {Record<string, string>} */
	const style = {
		'--f-thumbs-gap': `${gutter}px`,
	};

	/**
	 * Classic thumbs inner carousel: one Sync page = one viewport of N thumbs
	 * (legacy Pro nav used slidesPerPage: 1 + fill + dragFree).
	 *
	 * @return {Object}
	 */
	const pagedClassicCarousel = () => ({
		slidesPerPage: 1,
		fill: true,
		dragFree: true,
		center,
		Dots: false,
		Navigation: false,
		Arrows: false,
	});

	/* Default uncapped strip — do not change this path. */
	if (!hasVisibleLimit) {
		if (isAutoNav) {
			return {
				type: 'modern',
				style,
				equalSlots: false,
				paged: false,
			};
		}
		const pixels = resolveNavThumbPixelSize(navSize, slider, catalog);
		if (pixels) {
			style['--f-thumb-clip-width'] = `${pixels.width}px`;
			style['--f-thumb-width'] = `${pixels.width}px`;
			style['--f-thumb-height'] = `${pixels.height}px`;
		}
		return {
			type: 'modern',
			style,
			carousel: { center: true },
			equalSlots: Boolean(pixels),
			paged: false,
		};
	}

	/*
	 * Visible N > 0: paged classic strip (exactly N thumbs per Sync page).
	 * Auto → fixed 16:9 slots + capped/centered strip (not full-bleed stretch).
	 * Named/custom → fixed pixel thumbs + capped strip max-width.
	 */
	if (isAutoNav) {
		const thumbH = FANCYBOX_MODERN_HEIGHT_PX;
		const thumbW = Math.max(1, Math.round((thumbH * 16) / 9));
		style['--f-thumb-width'] = `${thumbW}px`;
		style['--f-thumb-height'] = `${thumbH}px`;
		style['--f-thumb-clip-width'] = `${thumbW}px`;
		style['--modula-slider-thumbs-max-width'] =
			visible <= 1
				? `${thumbW}px`
				: `calc((${thumbW}px + ${gutter}px) * ${visible} - ${gutter}px)`;
		return {
			type: 'classic',
			style,
			carousel: pagedClassicCarousel(),
			equalSlots: true,
			paged: true,
		};
	}

	const pixels = resolveNavThumbPixelSize(navSize, slider, catalog);
	if (pixels) {
		style['--f-thumb-clip-width'] = `${pixels.width}px`;
		style['--f-thumb-width'] = `${pixels.width}px`;
		style['--f-thumb-height'] = `${pixels.height}px`;
		style['--modula-slider-thumbs-max-width'] =
			visible <= 1
				? `${pixels.width}px`
				: `calc((${pixels.width}px + ${gutter}px) * ${visible} - ${gutter}px)`;
	} else {
		const thumbH = FANCYBOX_MODERN_HEIGHT_PX;
		const thumbW = Math.max(1, Math.round((thumbH * 16) / 9));
		style['--f-thumb-width'] = `${thumbW}px`;
		style['--f-thumb-height'] = `${thumbH}px`;
		style['--f-thumb-clip-width'] = `${thumbW}px`;
		style['--modula-slider-thumbs-max-width'] =
			visible <= 1
				? `${thumbW}px`
				: `calc((${thumbW}px + ${gutter}px) * ${visible} - ${gutter}px)`;
	}

	return {
		type: 'classic',
		style,
		carousel: pagedClassicCarousel(),
		equalSlots: true,
		paged: true,
	};
}

/**
 * @param {unknown} v
 * @return {boolean} Normalized toggle from schema/API values.
 */
export function toBool(v) {
	if (v === true || v === 1 || v === '1') {
		return true;
	}
	if (typeof v === 'string' && v.toLowerCase().trim() === 'true') {
		return true;
	}
	return false;
}

/**
 * @param {unknown} raw
 * @param {number} [fallback=1]
 * @return {number}
 */
function parsePositiveInt(raw, fallback = 1) {
	const n = parseInt(raw ?? fallback, 10);
	return Math.max(1, Number.isFinite(n) ? n : fallback);
}

/**
 * Fancyapps page size for a row: Thumbs Sync needs 1-slide pages; otherwise
 * multi-tile rows use "auto" so CSS slide width packs the viewport.
 *
 * @param {number} slidesToShow
 * @param {boolean} useThumbsPlugin
 * @return {1|'auto'}
 */
function slidesPerPageForRow(slidesToShow, useThumbsPlugin) {
	return useThumbsPlugin || slidesToShow <= 1 ? 1 : 'auto';
}

/**
 * Arrow/keyboard step when it must differ from Fancyapps’ native page size.
 * 0 = leave next/prev alone.
 *
 * @param {number} slidesToShow
 * @param {number} slidesToScroll
 * @param {boolean} useThumbsPlugin
 * @return {number}
 */
function navigationStepForRow(slidesToShow, slidesToScroll, useThumbsPlugin) {
	const nativePageSize = useThumbsPlugin ? 1 : slidesToShow;
	return slidesToScroll !== nativePageSize ? slidesToScroll : 0;
}

/**
 * Carousel options that change with visible slide count (desktop / tablet / mobile).
 *
 * @param {object} args
 * @param {number} args.slidesToShow
 * @param {boolean} args.centerModeOn
 * @param {boolean} args.adaptiveHeight
 * @param {boolean} args.useThumbsPlugin
 * @param {unknown} args.centerPadding
 * @param {number} args.gutterPx
 * @return {Object}
 */
function carouselOptionsForSlideRow({
	slidesToShow,
	centerModeOn,
	adaptiveHeight,
	useThumbsPlugin,
	centerPadding,
	gutterPx,
}) {
	const center = centerModeOn && slidesToShow <= 1;
	/** @type {Object} */
	const opts = {
		slidesPerPage: slidesPerPageForRow(slidesToShow, useThumbsPlugin),
		center,
		fill:
			slidesToShow <= 1 && !center && !adaptiveHeight && !useThumbsPlugin,
		style: {
			'--f-carousel-gap': `${gutterPx}px`,
			'--f-carousel-slide-width': carouselSlideWidthForRow(
				slidesToShow,
				center,
				centerPadding,
				gutterPx
			),
		},
	};
	return opts;
}

/**
 * Live / editor viewport for slider navigation steps (matches Fancyapps breakpoints).
 *
 * @param {'desktop'|'tablet'|'mobile'|null|undefined} forcedPreview
 * @return {'desktop'|'tablet'|'mobile'}
 */
export function resolveSliderNavViewport(forcedPreview) {
	if (
		forcedPreview === 'desktop' ||
		forcedPreview === 'tablet' ||
		forcedPreview === 'mobile'
	) {
		return forcedPreview;
	}
	if (
		typeof window !== 'undefined' &&
		typeof window.matchMedia === 'function'
	) {
		if (window.matchMedia('(max-width: 600px)').matches) {
			return 'mobile';
		}
		if (window.matchMedia('(max-width: 1024px)').matches) {
			return 'tablet';
		}
	}
	return 'desktop';
}

/**
 * @param {{ desktop?: number, tablet?: number, mobile?: number }|null|undefined} steps
 * @param {number} fallback
 * @param {'desktop'|'tablet'|'mobile'|null|undefined} forcedPreview
 * @return {number}
 */
export function resolveSliderNavigationStep(steps, fallback, forcedPreview) {
	const viewport = resolveSliderNavViewport(forcedPreview);
	const fromMap =
		steps && typeof steps === 'object' ? steps[viewport] : undefined;
	const n = parseInt(fromMap ?? fallback ?? 0, 10);
	return Math.max(0, Number.isFinite(n) ? n : 0);
}

/**
 * CSS aspect-ratio for fixed-height slider slides (when adaptive height is off).
 * Pro parity: custom dimensions, else 16:9 when a bounded width is configured.
 *
 * @param {Object} settings Grouped v2 settings.
 * @return {string|null} e.g. "16 / 9", or null when adaptive height is on.
 */
export function resolveSliderSlideAspectRatio(settings) {
	const slider = settings?.slider || {};
	if (toBool(slider.adaptiveHeight)) {
		return null;
	}
	const sizeKey =
		typeof slider.imageSize === 'string' ? slider.imageSize.trim() : '';
	if (sizeKey === 'custom') {
		const w = parseInt(slider.imageDimensions?.width ?? 0, 10);
		const h = parseInt(slider.imageDimensions?.height ?? 0, 10);
		if (w > 0 && h > 0) {
			return `${w} / ${h}`;
		}
	}
	return '16 / 9';
}

/**
 * @param {Object} settings - Grouped v2 settings.
 * @param {{
 *   previewViewport?: 'desktop'|'tablet'|'mobile',
 *   imageSizeDimensions?: Record<string, { width?: number, height?: number }>,
 * }} [opts]
 * @return {{
 *   carouselOptions: Object,
 *   useAutoplayPlugin: boolean,
 *   useThumbsPlugin: boolean,
 *   navigationStepBySlide: number,
 *   navigationSteps: { desktop: number, tablet: number, mobile: number },
 *   thumbsStripStyle?: Record<string, string>,
 *   thumbsEqualSlots?: boolean,
 *   thumbsPaged?: boolean,
 * }} Options and plugin flags for Carousel().init().
 */
export function sliderSettingsToCarousel(settings, opts = {}) {
	const slider = settings?.slider || {};
	const performance = settings?.performance || {};
	const responsive = settings?.responsive || {};
	const general = settings?.general || {};
	const layout = settings?.layout || {};
	const previewViewport =
		opts.previewViewport === 'desktop' ||
		opts.previewViewport === 'tablet' ||
		opts.previewViewport === 'mobile'
			? opts.previewViewport
			: null;

	const imageSizeDimensions = normalizeImageSizeDimensionsCatalog(
		opts.imageSizeDimensions
	);

	const responsiveOn = toBool(responsive.enableResponsive);

	const desktopSlidesToShow = parsePositiveInt(slider.slidesToShow, 1);
	const desktopSlidesToScroll = parsePositiveInt(slider.slidesToScroll, 1);
	const tabletSlidesToShow = parsePositiveInt(slider.tabletSlides, 1);
	const tabletSlidesToScroll = parsePositiveInt(slider.tabletScrolls, 1);
	const mobileSlidesToShow = parsePositiveInt(slider.mobileSlides, 1);
	const mobileSlidesToScroll = parsePositiveInt(slider.mobileScrolls, 1);

	const gutterPx = Math.max(0, parseInt(layout.gutter ?? 10, 10));
	const tabletGutterPx = Math.max(
		0,
		parseInt(layout.tabletGutter ?? gutterPx, 10)
	);
	const mobileGutterPx = Math.max(
		0,
		parseInt(layout.mobileGutter ?? gutterPx, 10)
	);

	let slidesToShow = desktopSlidesToShow;
	let slidesToScroll = desktopSlidesToScroll;
	let effectiveGutterPx = gutterPx;

	if (responsiveOn && previewViewport === 'tablet') {
		slidesToShow = tabletSlidesToShow;
		slidesToScroll = tabletSlidesToScroll;
		effectiveGutterPx = tabletGutterPx;
	} else if (responsiveOn && previewViewport === 'mobile') {
		slidesToShow = mobileSlidesToShow;
		slidesToScroll = mobileSlidesToScroll;
		effectiveGutterPx = mobileGutterPx;
	}

	let initialPage = parseInt(slider.initialSlide ?? 0, 10);
	if (initialPage > 0) {
		initialPage -= 1;
	}
	initialPage = Math.max(0, initialPage);

	const adaptiveHeight = toBool(slider.adaptiveHeight);
	const draggable = toBool(
		slider.draggable === undefined ? true : slider.draggable
	);
	const arrowsOn = toBool(slider.arrows === undefined ? true : slider.arrows);
	const arrowsInsideOn = arrowsOn && toBool(slider.arrowsInside);

	/** Thumbnail rail when Syncing is on (Fancyapps Thumbs). */
	const useThumbsPlugin = toBool(slider.syncing);

	const centerModeOn = toBool(slider.centerMode);

	const desktopRow = carouselOptionsForSlideRow({
		slidesToShow,
		centerModeOn,
		adaptiveHeight,
		useThumbsPlugin,
		centerPadding: slider.centerPadding,
		gutterPx: effectiveGutterPx,
	});

	/** @type {Record<string, string>|undefined} */
	let thumbsStripStyle;
	/** @type {boolean} */
	let thumbsEqualSlots = false;
	/** @type {boolean} */
	let thumbsPaged = false;
	const carouselOptions = {
		adaptiveHeight,
		Dots: toBool(slider.dots),
		transition: toBool(slider.fade) ? 'fade' : 'slide',
		infinite: toBool(
			slider.infinite === undefined ? true : slider.infinite
		),
		pauseOnHover: toBool(slider.pauseOnHover),
		rtl: toBool(slider.rtl),
		initialPage,
		Arrows: arrowsOn,
		...desktopRow,
	};

	/*
	 * Fancyapps Arrows use `--f-arrow-pos` (absolute over the carousel).
	 * Legacy Pro: outside ≈ -22px, inside ≈ 10px (`--f-button-*-pos`).
	 */
	if (arrowsOn) {
		carouselOptions.style = {
			...(carouselOptions.style &&
			typeof carouselOptions.style === 'object'
				? carouselOptions.style
				: {}),
			'--f-arrow-pos': arrowsInsideOn ? '12px' : '-22px',
		};
	}

	if (useThumbsPlugin) {
		const gutter = Math.max(
			0,
			parseInt(slider.syncingNavThumbnailsGutter ?? 10, 10)
		);
		const borderRaw = slider.syncingNavThumbnailsBorderColor;
		const borderColor =
			typeof borderRaw === 'string' && borderRaw.trim() !== ''
				? borderRaw.trim()
				: '#000000';
		const visibleLayout = buildSliderThumbsStripLayout(
			slider.syncingNavThumbnailsNumber,
			gutter,
			slider,
			imageSizeDimensions
		);

		/**
		 * Fancyapps Thumbs (@see https://fancyapps.com/carousel/plugins/thumbs/):
		 * - Visible N > 0 → always `classic` (inner carousel + Sync), paged by N.
		 * - Visible 0 + single-slide/scroll → `modern`.
		 * - Otherwise `classic` Sync for multi-tile main rows.
		 */
		const usePagedThumbs = Boolean(visibleLayout?.paged);
		const useModernThumbs =
			!usePagedThumbs && slidesToShow === 1 && slidesToScroll === 1;
		const thumbsType = useModernThumbs ? 'modern' : 'classic';

		carouselOptions.Thumbs = {
			type: thumbsType,
			minCount: 1,
			showOnStart: true,
		};
		if (thumbsType === 'classic' && visibleLayout?.carousel) {
			carouselOptions.Thumbs.Carousel = visibleLayout.carousel;
		} else if (
			thumbsType === 'modern' &&
			visibleLayout?.type === 'modern' &&
			visibleLayout?.carousel
		) {
			carouselOptions.Thumbs.Carousel = visibleLayout.carousel;
		}
		thumbsStripStyle = {
			'--f-thumbs-gap': `${gutter}px`,
			'--f-thumb-selected-shadow': `0 0 0 2px ${borderColor}`,
			...(visibleLayout?.style || {}),
		};
		thumbsEqualSlots = Boolean(visibleLayout?.equalSlots);
		thumbsPaged = usePagedThumbs;
	} else {
		carouselOptions.Thumbs = false;
	}

	if (!draggable) {
		carouselOptions.gestures = false;
	}

	if (toBool(performance.lazyLoad)) {
		carouselOptions.Lazyload = {
			preload: adaptiveHeight ? 2 : 1,
		};
	}

	/**
	 * Frontend: Fancyapps breakpoints apply tablet/mobile show (+ gutter/center).
	 * Editor preview bakes the forced viewport into the base options above.
	 */
	if (responsiveOn && !previewViewport) {
		const tabletRow = carouselOptionsForSlideRow({
			slidesToShow: tabletSlidesToShow,
			centerModeOn,
			adaptiveHeight,
			useThumbsPlugin,
			centerPadding: slider.centerPadding,
			gutterPx: tabletGutterPx,
		});
		const mobileRow = carouselOptionsForSlideRow({
			slidesToShow: mobileSlidesToShow,
			centerModeOn,
			adaptiveHeight,
			useThumbsPlugin,
			centerPadding: slider.centerPadding,
			gutterPx: mobileGutterPx,
		});
		const mergeArrowPos = (row) => {
			if (!arrowsOn || !row || typeof row !== 'object') {
				return row;
			}
			return {
				...row,
				style: {
					...(row.style && typeof row.style === 'object'
						? row.style
						: {}),
					'--f-arrow-pos': arrowsInsideOn ? '12px' : '-22px',
				},
			};
		};
		carouselOptions.breakpoints = {
			[`(max-width: ${parsePositiveInt(responsive.treatAsTabletUnder, 1024)}px)`]:
				mergeArrowPos(tabletRow),
			[`(max-width: ${parsePositiveInt(responsive.treatAsPhoneUnder, 600)}px)`]:
				mergeArrowPos(mobileRow),
		};
	}

	const widthStr =
		typeof general.width === 'string' ? general.width.trim() : '';
	/** snapSlides + multi-tile rows fight; keep for single-slide / Pro parity only. */
	if (widthStr !== '' && slidesToShow <= 1) {
		carouselOptions.snapSlides = widthStr.toLowerCase();
	}

	const autoplayOn = toBool(slider.autoplay);
	if (autoplayOn) {
		carouselOptions.Autoplay = {
			autoStart: true,
			timeout: Math.max(0, parseInt(slider.autoplaySpeed ?? 3000, 10)),
			pauseOnHover: toBool(slider.pauseOnHover),
		};
	}

	const speed = parseInt(slider.speed ?? 300, 10);
	if (Number.isFinite(speed) && speed > 0) {
		carouselOptions.tween = {
			friction: Math.max(10, Math.round(6000 / speed)),
		};
	}

	const navigationSteps = {
		desktop: navigationStepForRow(
			desktopSlidesToShow,
			desktopSlidesToScroll,
			useThumbsPlugin
		),
		tablet: responsiveOn
			? navigationStepForRow(
					tabletSlidesToShow,
					tabletSlidesToScroll,
					useThumbsPlugin
				)
			: navigationStepForRow(
					desktopSlidesToShow,
					desktopSlidesToScroll,
					useThumbsPlugin
				),
		mobile: responsiveOn
			? navigationStepForRow(
					mobileSlidesToShow,
					mobileSlidesToScroll,
					useThumbsPlugin
				)
			: navigationStepForRow(
					desktopSlidesToShow,
					desktopSlidesToScroll,
					useThumbsPlugin
				),
	};

	const navigationStepBySlide = navigationStepForRow(
		slidesToShow,
		slidesToScroll,
		useThumbsPlugin
	);

	return {
		carouselOptions,
		useAutoplayPlugin: autoplayOn,
		useThumbsPlugin,
		navigationStepBySlide,
		navigationSteps,
		adaptiveHeight,
		slideAspectRatio: resolveSliderSlideAspectRatio(settings),
		thumbsStripStyle,
		thumbsEqualSlots,
		thumbsPaged,
		arrowsInside: arrowsInsideOn,
		arrowsEnabled: arrowsOn,
	};
}
