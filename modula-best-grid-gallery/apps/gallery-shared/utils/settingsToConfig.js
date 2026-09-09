/**
 * Modula Gallery - Map grouped settings (v2 JSON) to flat config for the UI.
 * Frontend reads settings (grouped) and derives the config shape components expect.
 *
 * @package
 */

import {
	PARALLAX_MOTION_PRESET_DEFAULT,
	PARALLAX_MOTION_PRESET_IDS,
} from './parallaxMasonryPresets';
import { sliderSettingsToCarousel } from './sliderSettingsToCarousel';
import { storySettingsToCarousel } from './storySettingsToCarousel';
import { resolveUniformGridTileAspect } from './uniformGridTileAspect';
import {
	fitGridContainObjectPositionFromConfig,
	normalizeFitGridImageAlign,
} from './fitGridImageAlign';
import { clampUniformGridColumnCount } from './uniformGridColumns';
import {
	isGalleryTypeWithoutLightbox,
	isGalleryTypeWithoutLoadingEffects,
	DEFAULT_GALLERY_TYPE,
} from '../constants/galleryLayoutDefaults';
import {
	galleryTypeSupportsBelowImageCaptions,
	galleryTypeSupportsCompactCaptionPopover,
} from './captionPlacement';
import { resolveCompactCaptionMinSize } from './compactCaptionTile';
import {
	lightboxSettingsToFancyboxOpts,
	isLightboxToggleOn,
} from './lightboxSettingsToFancyboxOpts';
import { isResponsiveSettingsSupportedForGalleryType } from './galleryLayoutEditorSupport';
import {
	groupedUiSettingsToConfig,
	mergeLegacyJsConfigIntoConfig,
} from './mergeLegacyJsConfig';
import { clampMasonryGalleryWidth } from './clampMasonryGalleryWidth';

/**
 * @param {unknown} openOn
 * @returns {'both'|'desktop'|'mobile'}
 */
function resolveLightboxDevices(openOn) {
	const mode =
		typeof openOn === 'string' && openOn.trim() !== ''
			? openOn.trim()
			: 'both';
	if (mode === 'desktop' || mode === 'mobile' || mode === 'both') {
		return mode;
	}
	return 'both';
}

/**
 * Legacy Showcase clickBehavior → shared lightbox mode.
 *
 * @param {unknown} clickBehavior
 * @returns {'fancybox'|'no-link'|'external-url'|null}
 */
export function mapShowcaseClickBehaviorToLightbox(clickBehavior) {
	const click = String(clickBehavior || '').trim();
	if (click === 'lightbox') {
		return 'fancybox';
	}
	if (click === 'none') {
		return 'no-link';
	}
	if (click === 'item-link') {
		return 'external-url';
	}
	return null;
}

/**
 * Showcase click mode: shared lightbox settings win; legacy clickBehavior
 * maps only when the shared mode is missing. Missing clickBehavior keeps the
 * historical Showcase default (item-link → external-url).
 *
 * @param {Object} lightbox
 * @param {Object} showcase
 * @returns {string}
 */
export function resolveShowcaseLightboxMode(lightbox = {}, showcase = {}) {
	const shared =
		typeof lightbox?.lightbox === 'string' ? lightbox.lightbox.trim() : '';
	if (shared !== '') {
		return shared;
	}
	const clickRaw = showcase?.clickBehavior;
	const click =
		clickRaw === undefined ||
		clickRaw === null ||
		String(clickRaw).trim() === ''
			? 'item-link'
			: clickRaw;
	return mapShowcaseClickBehaviorToLightbox(click) || 'fancybox';
}

/**
 * Parallax overlay: on only when backend sends a clear “on” (missing/undefined = off).
 * @param raw
 */
export function isParallaxOverlayOn(raw) {
	if (raw === true || raw === 1 || raw === '1') {
		return true;
	}
	if (typeof raw === 'string' && raw.toLowerCase().trim() === 'true') {
		return true;
	}
	return false;
}

/**
 * Build flat config from grouped settings (modula_settings_v2 shape).
 * Same semantics as backend grouped schema for type, columns, gutter, etc.
 *
 * @param {Object} settings - Grouped settings { general, layout, lightbox, responsive, social, captions, ... }
 * @param {Object} opts     - Optional { inView?: boolean }
 * @return {Object} Config object (type, columns, gutter, grid_type, rowHeight, lightbox, ...)
 */
export function settingsToConfig(settings, opts = {}) {
	if (!settings || typeof settings !== 'object') {
		return {};
	}

	const general = settings.general || {};
	const layout = settings.layout || {};
	const lightbox = settings.lightbox || {};
	const responsive = settings.responsive || {};
	const social = settings.social || {};
	const captions = settings.captions || {};
	const loadingEffects = settings.loadingEffects || {};
	const performance = settings.performance || {};
	const slider = settings.slider || {};
	const story = settings.story || {};
	const showcase = settings.showcase || {};
	const template = settings.template || {};
	const video = settings.video || {};
	const style = settings.style || {};
	const polaroid = settings.polaroid || {};
	const parallaxMasonry = settings.parallaxMasonry || {};
	const parallaxOverlayRaw =
		layout.parallaxOverlayEnabled ?? parallaxMasonry.enableOverlay;
	const parallaxOverlayBackgroundRaw =
		layout.parallaxOverlayBackground ?? parallaxMasonry.overlayGradient;
	const parallaxCaptionRaw =
		layout.parallaxCaption ?? parallaxMasonry.caption;
	const parallaxMotionPresetRaw =
		layout.parallaxMotionPreset ?? parallaxMasonry.motionPreset;
	const motionPresetRaw =
		typeof parallaxMotionPresetRaw === 'string'
			? parallaxMotionPresetRaw.trim().toLowerCase()
			: '';
	const parallaxMotionPreset = PARALLAX_MOTION_PRESET_IDS.includes(
		motionPresetRaw
	)
		? motionPresetRaw
		: PARALLAX_MOTION_PRESET_DEFAULT;

	const uniformTile = resolveUniformGridTileAspect(
		layout.uniformGridTileAspect,
		layout.uniformGridTileAspectCustom
	);

	const polaroidRotationMax = Math.min(
		14,
		Math.max(0, parseInt(polaroid.rotationMax ?? 7, 10) || 0)
	);
	const polaroidScatterMax = Math.min(
		28,
		Math.max(0, parseInt(polaroid.scatterMax ?? 12, 10) || 0)
	);
	const polaroidShowPin =
		polaroid.showPin !== false &&
		polaroid.showPin !== 0 &&
		polaroid.showPin !== '0';
	const polaroidFramePadding = Math.min(
		28,
		Math.max(4, parseInt(polaroid.framePadding ?? 12, 10) || 12)
	);
	const polaroidChinHeight = Math.min(
		80,
		Math.max(12, parseInt(polaroid.chinHeight ?? 36, 10) || 36)
	);
	const polaroidUniformSizeExplicitOff =
		polaroid.uniformSize === false ||
		polaroid.uniformSize === 0 ||
		polaroid.uniformSize === '0';
	const polaroidUniformSize =
		polaroid.uniformSize === true ||
		polaroid.uniformSize === 1 ||
		polaroid.uniformSize === '1' ||
		(!polaroidUniformSizeExplicitOff && polaroid.uniformSize == null);
	const polaroidUniformColumns = Math.min(
		12,
		Math.max(
			0,
			parseInt(
				polaroid.uniformColumns !== undefined &&
					polaroid.uniformColumns !== null &&
					polaroid.uniformColumns !== ''
					? polaroid.uniformColumns
					: 3,
				10
			) || 0
		)
	);
	const polaroidRandomFactor =
		parseInt(polaroid.randomFactor ?? 50, 10) / 100;
	const DEFAULT_PARALLAX_OVERLAY_BG =
		'linear-gradient(180deg, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.5) 40%, rgba(0,0,0,0.15) 72%, rgba(0,0,0,0) 100%)';

	const type = general.type || DEFAULT_GALLERY_TYPE;
	let gridType = layout.gridType || 'automatic';
	if (type === 'justified-grid' || type === 'parallax-masonry') {
		gridType = 'automatic';
	}

	let columns = 12;
	if (
		type === 'grid' &&
		gridType !== '' &&
		gridType !== 'automatic' &&
		!Number.isNaN(Number(gridType))
	) {
		columns = Math.min(12, Math.max(1, parseInt(gridType, 10)));
	} else if (type === 'parallax-masonry') {
		/* Same idea as MasonryLayout columnsCount: gridType 1–12 or default 3 */
		let mc = 3;
		if (
			layout.gridType &&
			layout.gridType !== 'automatic' &&
			!Number.isNaN(parseInt(layout.gridType, 10))
		) {
			const g = parseInt(layout.gridType, 10);
			if (g >= 1 && g <= 12) {
				mc = g;
			}
		}
		columns = mc;
	} else if (type === 'uniform-grid' || type === 'fit-grid') {
		columns = clampUniformGridColumnCount(layout.gridType, 4);
	}

	// Use fallback only when missing; 0 is valid (backend used to send false for 0).
	const gutter = Number(layout.gutter);
	const tabletGutter = Number(layout.tabletGutter);
	const mobileGutter = Number(layout.mobileGutter);
	const gutterNum = Number.isFinite(gutter) ? gutter : 10;
	const tabletGutterNum = Number.isFinite(tabletGutter)
		? tabletGutter
		: gutterNum;
	const mobileGutterNum = Number.isFinite(mobileGutter)
		? mobileGutter
		: gutterNum;

	const heightArr = Array.isArray(general.height)
		? general.height
		: [800, 800, 800];
	const h0 = parseInt(heightArr[0] ?? 800, 10);
	const h1 = parseInt(heightArr[1] ?? h0, 10);
	const h2 = parseInt(heightArr[2] ?? h0, 10);

	let lb = lightbox.lightbox || 'fancybox';
	if (type === 'showcase') {
		lb = resolveShowcaseLightboxMode(lightbox, showcase);
	} else if (isGalleryTypeWithoutLightbox(type)) {
		lb = 'no-link';
	} else if (
		type === 'slider' &&
		slider.lightbox !== undefined &&
		slider.lightbox !== ''
	) {
		lb = slider.lightbox;
	}
	// Allow host to override via global (e.g. modula_disable_lightboxes)
	if (
		typeof window !== 'undefined' &&
		window.ModulaDisableLightboxes &&
		!['no-link', 'direct', 'external-url', 'attachment-page'].includes(lb)
	) {
		lb = 'fancybox';
	}

	const inViewPermitted = [
		'custom-grid',
		'creative-gallery',
		'grid',
		'justified-grid',
		'uniform-grid',
		'fit-grid',
		'polaroid',
	];
	const inView =
		!isGalleryTypeWithoutLoadingEffects(type) &&
		(opts.inView ?? !!loadingEffects.inView) &&
		inViewPermitted.includes(type);

	const lazyLoadFlag = performance.lazyLoad !== false ? 1 : 0;

	/** @type {Record<string, { width?: number, height?: number }>|undefined} */
	let imageSizeDimensions = opts.imageSizeDimensions;
	if (
		(!imageSizeDimensions || typeof imageSizeDimensions !== 'object') &&
		typeof window !== 'undefined' &&
		window.modulaSettingsEditor &&
		typeof window.modulaSettingsEditor.imageSizeDimensions === 'object'
	) {
		imageSizeDimensions = window.modulaSettingsEditor.imageSizeDimensions;
	}

	/** @type {Object|null} */
	let sliderCarousel = null;
	if (type === 'slider') {
		sliderCarousel = sliderSettingsToCarousel(settings, {
			previewViewport: opts.previewViewport,
			imageSizeDimensions,
		});
	}

	/** @type {Object|null} */
	let storyCarousel = null;
	if (type === 'story') {
		storyCarousel = storySettingsToCarousel(settings);
	}

	/** Pro: slider_image_info / slider_image_info_position (item template + caption hooks). */
	const sliderImageInfo =
		type === 'slider' &&
		(slider.imageInfo === true ||
			slider.imageInfo === 1 ||
			slider.imageInfo === '1');
	const sliderImageInfoPosition =
		typeof slider.imageInfoPosition === 'string' &&
		slider.imageInfoPosition.trim() !== ''
			? slider.imageInfoPosition.trim()
			: 'bot_outside';

	const galleryWidthRaw =
		typeof general.width === 'string' && general.width.trim() !== ''
			? general.width.trim()
			: '100%';
	const galleryWidth = clampMasonryGalleryWidth(galleryWidthRaw, type);

	const uiConfig = groupedUiSettingsToConfig(settings);
	if (isGalleryTypeWithoutLoadingEffects(type)) {
		uiConfig.loadedScale = 100;
		uiConfig.loadedRotate = 0;
		uiConfig.loadedHSlide = 0;
		uiConfig.loadedVSlide = 0;
	}

	const contentPlacementRaw =
		typeof captions.contentPlacement === 'string' &&
		captions.contentPlacement.trim() !== ''
			? captions.contentPlacement.trim()
			: 'inside-image';
	const contentPlacement = galleryTypeSupportsBelowImageCaptions(type)
		? contentPlacementRaw
		: 'inside-image';

	const baseConfig = {
		type,
		width: galleryWidth,
		galleryId: opts.galleryId || '',
		...(opts.previewViewport === 'desktop' ||
		opts.previewViewport === 'tablet' ||
		opts.previewViewport === 'mobile'
			? { previewViewport: opts.previewViewport }
			: {}),
		columns,
		grid_type: gridType,
		gutter: gutterNum,
		desktopGutter: gutterNum,
		tabletGutter: tabletGutterNum,
		mobileGutter: mobileGutterNum,
		enableResponsive:
			type === 'polaroid'
				? polaroidUniformSize && responsive.enableResponsive
					? 1
					: 0
				: isResponsiveSettingsSupportedForGalleryType(type) &&
					  responsive.enableResponsive
					? 1
					: 0,
		tabletColumns: parseInt(responsive.tabletColumns ?? 2, 10),
		mobileColumns: parseInt(responsive.mobileColumns ?? 1, 10),
		treatAsTabletUnder: parseInt(responsive.treatAsTabletUnder ?? 1024, 10),
		treatAsPhoneUnder: parseInt(responsive.treatAsPhoneUnder ?? 600, 10),
		height: h0,
		desktopHeight: h0,
		tabletHeight: h1,
		mobileHeight: h2,
		lightbox: lb,
		/*
		 * openOn (flat open_Lightbox_on) → lightbox_devices for
		 * isModulaLightboxAllowedOnDevice / legacy modulacheckDevice.
		 */
		lightbox_devices: resolveLightboxDevices(lightbox.openOn),
		doubleClick: isLightboxToggleOn(lightbox.doubleClick) ? 1 : 0,
		mobileDoubleClick: isLightboxToggleOn(lightbox.doubleClick) ? 1 : 0,
		lightboxOpts: lightboxSettingsToFancyboxOpts(settings, {
			galleryId: opts.galleryId,
			galleryComments: opts.galleryComments,
		}),
		enableSocial: !!social.enableSocial,
		enableTwitter: !!social.enableTwitter,
		enableFacebook: !!social.enableFacebook,
		enableWhatsapp: !!social.enableWhatsapp,
		enablePinterest: !!social.enablePinterest,
		enableLinkedin: !!social.enableLinkedin,
		enableEmail: !!social.enableEmail,
		socialDesktopCollapsed: !!social.socialDesktopCollapsed,
		socialIconColor:
			typeof social.socialIconColor === 'string'
				? social.socialIconColor.trim()
				: '',
		socialIconSize: parseInt(social.socialIconSize ?? 0, 10) || 0,
		socialIconPadding: parseInt(social.socialIconPadding ?? 0, 10) || 0,
		hideTitle: !!captions.hideTitle,
		hideDescription: !!captions.hideDescription,
		titleFontSize: parseInt(captions.titleFontSize ?? 0, 10) || 0,
		captionFontSize: parseInt(captions.captionFontSize ?? 0, 10) || 0,
		titleColor:
			typeof captions.titleColor === 'string'
				? captions.titleColor.trim()
				: '',
		captionColor:
			typeof captions.captionColor === 'string'
				? captions.captionColor.trim()
				: '',
		titleFontWeight:
			typeof captions.titleFontWeight === 'string'
				? captions.titleFontWeight.trim()
				: '',
		captionFontWeight:
			typeof captions.captionFontWeight === 'string'
				? captions.captionFontWeight.trim()
				: '',
		/** When true, suppress gallery post title (`modula-gallery-title`). Default: hide. */
		hideGalleryTitle: captions.hideGalleryTitle ?? true,
		galleryTitleType:
			typeof captions.galleryTitleType === 'string' &&
			captions.galleryTitleType.trim() !== ''
				? captions.galleryTitleType.trim()
				: 'p',
		mobileTitleFontSize:
			parseInt(captions.mobileTitleFontSize ?? 0, 10) || 0,
		mobileCaptionFontSize:
			parseInt(captions.mobileCaptionFontSize ?? 0, 10) || 0,
		mobileCaptionCopy: !!captions.mobileCaptionCopy,
		contentPlacement,
		/** Default on — small-tile title/caption popover (hover / long-press). */
		compactCaptionPopover:
			galleryTypeSupportsCompactCaptionPopover(type) &&
			captions.compactCaptionPopover !== false &&
			captions.compactCaptionPopover !== 0 &&
			captions.compactCaptionPopover !== '0',
		/** Shortest-side threshold (px) for compact caption popover. Default 240. */
		compactCaptionMinSize: resolveCompactCaptionMinSize(
			captions.compactCaptionMinSize
		),
		belowImageAlignment:
			typeof captions.belowImageAlignment === 'string' &&
			captions.belowImageAlignment.trim() !== ''
				? captions.belowImageAlignment.trim()
				: 'left',
		belowImageSpacing: Math.min(
			48,
			Math.max(0, parseInt(captions.belowImageSpacing ?? 8, 10) || 0)
		),
		belowImagePadding: Math.min(
			48,
			Math.max(0, parseInt(captions.belowImagePadding ?? 0, 10) || 0)
		),
		lazyLoad: lazyLoadFlag,
		randomFactor: parseInt(general.randomFactor ?? 50, 10) / 100,
		inView,
		email_subject: social.emailSubject || '',
		email_message: social.emailMessage || '',
		rowHeight: (() => {
			const raw = layout.gridRowHeight;
			if (raw === undefined || raw === null || raw === '') {
				return null;
			}
			const n = parseInt(raw, 10);
			return Number.isFinite(n) ? n : null;
		})(),
		lastRow: layout.gridJustifyLastRow || 'justify',
		/** Parallax masonry: show dimming/gradient overlay */
		parallaxOverlayEnabled: isParallaxOverlayOn(parallaxOverlayRaw),
		/** Parallax masonry: CSS background for overlay (gradient opaque → transparent) */
		parallaxOverlayBackground:
			typeof parallaxOverlayBackgroundRaw === 'string' &&
			parallaxOverlayBackgroundRaw.trim() !== ''
				? parallaxOverlayBackgroundRaw.trim()
				: DEFAULT_PARALLAX_OVERLAY_BG,
		/** Parallax masonry: optional center caption above the overlay */
		parallaxCaption:
			typeof parallaxCaptionRaw === 'string'
				? parallaxCaptionRaw.trim()
				: '',
		parallaxMotionPreset,
		sliderCarousel,
		/** Fancyapps Carousel options for story layout */
		storyCarousel,
		/** Showcase portfolio strip options (v2 `settings.showcase`) */
		showcase:
			type === 'showcase'
				? {
						visibleCount: Math.min(
							5,
							Math.max(
								2,
								parseInt(showcase.visibleCount, 10) || 3
							)
						),
						gap: (() => {
							const n = parseInt(showcase.gap, 10);
							/*
							 * Older showcase default was 64px (too airy for the
							 * portfolio look). Treat that legacy default as unset.
							 */
							if (!Number.isFinite(n) || n === 64) {
								return 32;
							}
							return Math.min(160, Math.max(0, n));
						})(),
						centerScale: (() => {
							const n = Number(showcase.centerScale);
							/*
							 * `1` was historically persisted when the range control
							 * fell back to `min` instead of the schema default — that
							 * killed the center “showcase” grow. Treat ≤1 as unset.
							 */
							if (!Number.isFinite(n) || n <= 1) {
								return 1.4;
							}
							return Math.min(1.75, Math.max(1.1, n));
						})(),
						centerBias:
							showcase.centerBias === 'left' ? 'left' : 'center',
						arrowPosition: [
							'bottom-right',
							'bottom-left',
							'sides',
						].includes(String(showcase.arrowPosition || '').trim())
							? String(showcase.arrowPosition).trim()
							: 'bottom-right',
						autoplay:
							showcase.autoplay === true ||
							showcase.autoplay === 1 ||
							showcase.autoplay === '1',
						autoplayInterval: Math.min(
							15000,
							Math.max(
								1500,
								parseInt(showcase.autoplayInterval, 10) || 4000
							)
						),
						clickBehavior: [
							'item-link',
							'lightbox',
							'none',
						].includes(String(showcase.clickBehavior || '').trim())
							? String(showcase.clickBehavior).trim()
							: 'item-link',
						mobileSimplify:
							showcase.mobileSimplify !== false &&
							showcase.mobileSimplify !== 0 &&
							showcase.mobileSimplify !== '0',
					}
				: undefined,
		/** Template gallery preset slug (v2 `settings.template`) */
		template:
			type === 'template'
				? {
						templateLayout: [
							'split-stack',
							'asymmetric-trio',
							'offset-duo',
							'minimal-feature',
							'editorial-hero',
							'magazine-spread',
							'lookbook-ladder',
							'corner-collage',
							'portfolio-statement',
							'editorial-cluster',
						].includes(String(template.templateLayout || '').trim())
							? String(template.templateLayout).trim()
							: 'split-stack',
					}
				: undefined,
		/** Story-only options (e.g. iframe advance); v2 `settings.story` */
		story:
			type === 'story'
				? {
						videoIframeAdvanceMs: story.videoIframeAdvanceMs,
					}
				: undefined,
		/**
		 * Video settings for Video layout and mixed galleries with video items.
		 * Omitted for story/slider (their own video UX).
		 */
		video:
			type === 'story' ||
			type === 'slider' ||
			type === 'showcase' ||
			type === 'template'
				? undefined
				: {
						playlistPosition:
							video.playlistPosition === 'bottom'
								? 'bottom'
								: 'right',
						autoplayVideos:
							video.autoplayVideos === true ||
							video.autoplayVideos === 1 ||
							video.autoplayVideos === '1',
						loopVideos:
							video.loopVideos === true ||
							video.loopVideos === 1 ||
							video.loopVideos === '1',
						showVideoIcon: video.showVideoIcon !== false,
						useCustomIcon:
							video.useCustomIcon === true ||
							video.useCustomIcon === 1 ||
							video.useCustomIcon === '1',
						customVideoIcon: (() => {
							const raw = video.customVideoIcon;
							if (typeof raw === 'string' && raw.trim() !== '') {
								return raw.trim();
							}
							const id = parseInt(raw, 10);
							return Number.isFinite(id) && id > 0 ? id : 0;
						})(),
						customVideoIconUrl:
							typeof video.customVideoIconUrl === 'string'
								? video.customVideoIconUrl.trim()
								: '',
						videoIconIcon:
							typeof video.videoIconIcon === 'string' &&
							video.videoIconIcon.trim() !== ''
								? video.videoIconIcon.trim()
								: 'default',
						videoIconColor:
							typeof video.videoIconColor === 'string' &&
							video.videoIconColor.trim() !== ''
								? video.videoIconColor.trim()
								: '#FFF',
						playIconSize: Array.isArray(video.playIconSize)
							? video.playIconSize
							: [48, 40, 32],
						previewVideo:
							video.previewVideo === true ||
							video.previewVideo === 1 ||
							video.previewVideo === '1',
						previewVideoDuration: Math.max(
							1,
							Math.min(
								30,
								parseInt(video.previewVideoDuration, 10) || 3
							)
						),
						autoplayThumbnail:
							video.autoplayThumbnail === true ||
							video.autoplayThumbnail === 1 ||
							video.autoplayThumbnail === '1',
					},
		/** Fancyapps Thumbs plugin: slider + syncing (see sliderSettingsToCarousel) */
		sliderThumbsEnabled:
			type === 'slider' && sliderCarousel
				? !!sliderCarousel.useThumbsPlugin
				: false,
		sliderImageInfo,
		sliderImageInfoPosition,
		/**
		 * Adaptive height: Custom + crop fills gallery width; otherwise keep the
		 * served file’s intrinsic width (no upscaling thumbnails). Fixed-height
		 * tiles always use cover in CSS.
		 */
		sliderFillCrop:
			type === 'slider' &&
			String(slider.imageSize || '').trim() === 'custom' &&
			(slider.imageCrop === true ||
				slider.imageCrop === 1 ||
				slider.imageCrop === '1'),
		borderSize:
			type === 'story' ? 0 : parseInt(style.borderSize ?? 0, 10) || 0,
		borderRadius:
			type === 'story' ? 0 : parseInt(style.borderRadius ?? 0, 10) || 0,
		borderColor:
			typeof style.borderColor === 'string' &&
			style.borderColor.trim() !== ''
				? style.borderColor.trim()
				: '#000000',
		shadowSize:
			type === 'story' ? 0 : parseInt(style.shadowSize ?? 0, 10) || 0,
		shadowColor:
			typeof style.shadowColor === 'string' &&
			style.shadowColor.trim() !== ''
				? style.shadowColor.trim()
				: '#000000',
		/** Uniform grid: CSS aspect-ratio value for `.modula-uniform-grid__cell` (e.g. `1 / 1`). */
		uniformGridAspectCss: uniformTile.css,
		/** Numeric ratio for inline `aspectRatio` (Safari `var()` in aspect-ratio workaround). */
		uniformGridAspectRatio: uniformTile.ratio,
		fitGridImageAlign: normalizeFitGridImageAlign(layout.fitGridImageAlign),
		fitGridContainObjectPosition: fitGridContainObjectPositionFromConfig({
			type,
			fitGridImageAlign: layout.fitGridImageAlign,
		}),
		customCss:
			typeof style.customCss === 'string' ? style.customCss.trim() : '',
		hoverCursor:
			typeof settings.hover?.cursor === 'string' &&
			settings.hover.cursor.trim() !== ''
				? settings.hover.cursor.trim()
				: 'zoom-in',
		hoverChangeCursor: settings.hover?.changeCursor !== false,
		hoverColor:
			typeof settings.hover?.hoverColor === 'string'
				? settings.hover.hoverColor.trim()
				: '',
		hoverOpacity: parseInt(settings.hover?.hoverOpacity ?? 0, 10) || 0,
		hoverUploadCursor: parseInt(settings.hover?.uploadCursor ?? 0, 10) || 0,
		hoverCustomCursorUrl:
			typeof opts.hoverCustomCursorUrl === 'string'
				? opts.hoverCustomCursorUrl.trim()
				: '',
		respectReducedMotion:
			settings.interaction?.respectReducedMotion !== false,
		...uiConfig,
		polaroid: {
			randomFactor: polaroidRandomFactor,
			rotationMax: polaroidRotationMax,
			scatterMax: polaroidScatterMax,
			showPin: polaroidShowPin,
			framePadding: polaroidFramePadding,
			chinHeight: polaroidChinHeight,
			uniformSize: polaroidUniformSize,
			uniformColumns: polaroidUniformColumns,
		},
	};

	return mergeLegacyJsConfigIntoConfig(baseConfig, opts.legacyJsConfig || {});
}
