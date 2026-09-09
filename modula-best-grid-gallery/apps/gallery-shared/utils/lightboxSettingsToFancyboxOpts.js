/**
 * Map grouped v2 lightbox settings to @fancyapps/ui v6 Fancybox options.
 *
 * @package
 */
import { buildLightboxV6OptsFromFlat } from '../lightbox/buildLightboxV6Opts';
import { zoomSettingsToMzoomOpts } from './zoomSettingsToMzoomOpts';

/**
 * @param {*} value
 * @returns {boolean}
 */
export function isLightboxToggleOn(value) {
	if (value === true || value === 1 || value === '1') {
		return true;
	}
	if (typeof value === 'string' && value.toLowerCase().trim() === 'true') {
		return true;
	}
	return false;
}

/**
 * Whether lightbox should open for the editor preview viewport (openOn gating).
 *
 * @param {string} openOn
 * @param {'desktop'|'tablet'|'mobile'} previewViewport
 * @returns {boolean}
 */
export function isLightboxOpenAllowedOnPreviewViewport(
	openOn,
	previewViewport
) {
	const mode =
		typeof openOn === 'string' && openOn.trim() !== ''
			? openOn.trim()
			: 'both';
	if (mode === 'desktop') {
		return previewViewport === 'desktop' || previewViewport === 'tablet';
	}
	if (mode === 'mobile') {
		return previewViewport === 'mobile';
	}
	return true;
}

/**
 * Toolbar share follows `lightbox.share` when set; legacy galleries fall back to Social.
 *
 * @param {Object} lightbox
 * @param {Object} social
 * @returns {boolean}
 */
function isLightboxToolbarShareOn(lightbox, social) {
	if (lightbox && Object.prototype.hasOwnProperty.call(lightbox, 'share')) {
		return isLightboxToggleOn(lightbox.share);
	}
	return isLightboxToggleOn(social?.enableSocial);
}

/**
 * Build legacy flat keys from grouped settings (PHP enhancer parity).
 *
 * @param {Object} settings Grouped gallery settings.
 * @returns {Object}
 */
function groupedLightboxToFlatKeys(settings) {
	const lightbox = settings?.lightbox || {};
	const download = settings?.download || {};
	const social = settings?.social || {};
	const slideshow = settings?.slideshow || {};
	const comments = settings?.comments || {};
	const deeplink = settings?.deeplink || {};
	const zoom = settings?.zoom || {};
	const protection = settings?.protection || {};
	const video = settings?.video || {};

	const flat = {
		lightbox: lightbox.lightbox || 'fancybox',
		loop_lightbox: isLightboxToggleOn(lightbox.loop) ? 1 : 0,
		/*
		 * Image Guardian right-click protection → Fancybox v6 `modulaImagesProtected`
		 * (legacy Pro sets Images.protected via modula_fancybox_options).
		 */
		protection: isLightboxToggleOn(protection.protection) ? 1 : 0,
		right_click_message:
			typeof protection.rightClickMessage === 'string'
				? protection.rightClickMessage
				: '',
		lightbox_toolbar: isLightboxToggleOn(lightbox.toolbar) ? 1 : 0,
		lightbox_infobar:
			isLightboxToggleOn(lightbox.toolbar) &&
			isLightboxToggleOn(lightbox.infobar)
				? 1
				: 0,
		lightbox_zoom: isLightboxToggleOn(lightbox.zoom) ? 1 : 0,
		lightbox_download: isLightboxToggleOn(lightbox.download) ? 1 : 0,
		lightbox_thumbs: isLightboxToggleOn(lightbox.thumbs) ? 1 : 0,
		lightbox_close:
			isLightboxToggleOn(lightbox.toolbar) &&
			isLightboxToggleOn(lightbox.close)
				? 1
				: 0,
		lightbox_keyboard: 1,
		lightbox_wheel: 1,
		lightbox_clickSlide: isLightboxToggleOn(lightbox.clickSlide) ? 1 : 0,
		lightbox_thumbsAutoStart: isLightboxToggleOn(lightbox.showThumbnails)
			? 1
			: 0,
		lightbox_thumbsPosition: lightbox.thumbsPosition || 'bottom',
		lightbox_animationEffect: lightbox.animationEffect ?? 'false',
		lightbox_transitionEffect: lightbox.transitionEffect || 'fade',
		lightbox_touch: 1,
		lightbox_background_color: lightbox.backgroundColor || '',
		showTitleLightbox: isLightboxToggleOn(lightbox.showTitle) ? 1 : 0,
		showCaptionLightbox: isLightboxToggleOn(lightbox.showCaption) ? 1 : 0,
		captionPosition: lightbox.captionPosition || 'left',
		show_navigation: isLightboxToggleOn(lightbox.showNavigation) ? 1 : 0,
		open_Lightbox_on: lightbox.openOn || 'both',
		doubleClick: isLightboxToggleOn(lightbox.doubleClick) ? 1 : 0,
		enable_fullscreen: isLightboxToggleOn(lightbox.enableFullscreen)
			? 1
			: 0,
		open_fullscreen: isLightboxToggleOn(lightbox.openFullscreen) ? 1 : 0,
		enable_download: isLightboxToggleOn(download.enableDownload) ? 1 : 0,
		download_all_lightbox_button: isLightboxToggleOn(
			lightbox.downloadAllButton
		)
			? 1
			: 0,
		lightbox_share: isLightboxToolbarShareOn(lightbox, social) ? 1 : 0,
		lightbox_facebook: isLightboxToggleOn(social.enableFacebook) ? 1 : 0,
		lightbox_twitter: isLightboxToggleOn(social.enableTwitter) ? 1 : 0,
		lightbox_whatsapp: isLightboxToggleOn(social.enableWhatsapp) ? 1 : 0,
		lightbox_linkedin: isLightboxToggleOn(social.enableLinkedin) ? 1 : 0,
		lightbox_pinterest: isLightboxToggleOn(social.enablePinterest) ? 1 : 0,
		lightbox_email: isLightboxToggleOn(social.enableEmail) ? 1 : 0,
		email_subject:
			typeof social.emailSubject === 'string' ? social.emailSubject : '',
		email_message:
			typeof social.emailMessage === 'string' ? social.emailMessage : '',
		enableSlideshow: isLightboxToggleOn(slideshow.enableSlideshow) ? 1 : 0,
		enableAutoplay: isLightboxToggleOn(slideshow.enableAutoplay) ? 1 : 0,
		pauseOnHover: isLightboxToggleOn(slideshow.pauseOnHover) ? 1 : 0,
		slideshowSpeed: slideshow.slideshowSpeed ?? 5000,
		comment_status: isLightboxToggleOn(comments.commentStatus) ? 1 : 0,
		toggle_comments: isLightboxToggleOn(comments.toggleComments) ? 1 : 0,
		start_collapsed: isLightboxToggleOn(comments.startCollapsed) ? 1 : 0,
		modula_deeplink: isLightboxToggleOn(deeplink.modulaDeeplink) ? 1 : 0,
		customLinkName:
			typeof deeplink.customLinkName === 'string'
				? deeplink.customLinkName
				: '',
		'autoplay-videos': isLightboxToggleOn(video.autoplayVideos) ? 1 : 0,
		'loop-videos': isLightboxToggleOn(video.loopVideos) ? 1 : 0,
	};

	const mzoom = zoomSettingsToMzoomOpts(zoom);
	if (mzoom) {
		flat.enable_zoom = 1;
		flat.zoom_on_hover = isLightboxToggleOn(zoom.zoomOnHover) ? 1 : 0;
		flat.mzoom = mzoom;
	} else {
		flat.enable_zoom = 0;
		flat.zoom_on_hover = 0;
	}

	return flat;
}

/**
 * @param {Object} settings Grouped gallery settings.
 * @param {Object} [opts]
 * @param {number} [opts.galleryId]
 * @param {'desktop'|'tablet'|'mobile'} [opts.previewViewport]
 * @param {boolean} [opts.editorPreview]
 * @param {Object} [opts.galleryComments] Pro Comments runtime payload from bootstrap metadata.
 * @returns {Object} Fancybox v6 options (runtime layout applied in prepareModulaLightboxV6).
 */
export function lightboxSettingsToFancyboxOpts(settings, opts = {}) {
	const flat = groupedLightboxToFlatKeys(settings || {});
	flat.gallery_id = opts.galleryId;
	if (opts.galleryComments && typeof opts.galleryComments === 'object') {
		flat.galleryComments = opts.galleryComments;
	}

	const options = buildLightboxV6OptsFromFlat(flat, {
		editorPreview: opts.editorPreview,
	});

	return options;
}

/**
 * Hybrid open-time opts: grouped settings win over pre-built lightboxOpts.
 *
 * `settingsToConfig` may still attach lightboxOpts for CSS / toggle helpers.
 * At open, pass settings when available so remap is the source of truth.
 *
 * @param {Object} [args]
 * @param {Object|null|undefined} [args.settings] Grouped gallery settings.
 * @param {Object|null|undefined} [args.lightboxOpts] Pre-built Fancybox v6 opts.
 * @param {number} [args.galleryId]
 * @param {'desktop'|'tablet'|'mobile'} [args.previewViewport]
 * @param {boolean} [args.editorPreview]
 * @param {Object} [args.galleryComments]
 * @returns {Object}
 */
export function resolveModulaLightboxFancyboxOpts(args = {}) {
	const settings = args.settings;
	if (settings !== null && settings !== undefined && typeof settings === 'object') {
		const fromOpts =
			args.lightboxOpts &&
			typeof args.lightboxOpts === 'object' &&
			args.lightboxOpts.galleryComments &&
			typeof args.lightboxOpts.galleryComments === 'object'
				? args.lightboxOpts.galleryComments
				: undefined;
		return lightboxSettingsToFancyboxOpts(settings, {
			galleryId: args.galleryId,
			previewViewport: args.previewViewport,
			editorPreview: args.editorPreview,
			galleryComments: args.galleryComments || fromOpts,
		});
	}
	const lightboxOpts = args.lightboxOpts;
	if (
		lightboxOpts !== null &&
		lightboxOpts !== undefined &&
		typeof lightboxOpts === 'object'
	) {
		return lightboxOpts;
	}
	return {};
}

/**
 * Resolved lightbox backdrop color for editor preview.
 *
 * @param {Object} settings
 * @returns {string}
 */
export function lightboxPreviewBackgroundColor(settings) {
	const lightbox = settings?.lightbox || {};
	if (
		typeof lightbox.backgroundColor === 'string' &&
		lightbox.backgroundColor.trim() !== ''
	) {
		return lightbox.backgroundColor.trim();
	}
	return '';
}

/**
 * CSS variables for preview-only lightbox chrome (background).
 *
 * @param {Object} settings
 * @returns {Object} style object for preview host.
 */
export function lightboxPreviewDynamicStyles(settings) {
	const backgroundColor = lightboxPreviewBackgroundColor(settings);
	/** @type {Record<string, string>} */
	const style = {};

	if (backgroundColor !== '') {
		style['--fancybox-backdrop-bg'] = backgroundColor;
		style['--fancybox-bg'] = backgroundColor;
		style['--fancybox-opacity'] = '1';
	}

	return style;
}

/**
 * Whether prev/next nav should show in preview (CSS parity).
 *
 * @param {Object} settings
 * @returns {boolean}
 */
export function lightboxPreviewShowNavigation(settings) {
	return isLightboxToggleOn(settings?.lightbox?.showNavigation);
}

/**
 * @param {string} [captionPosition]
 * @returns {{ alignSelf: 'flex-start'|'center'|'flex-end', textAlign: 'left'|'center'|'right' }}
 */
export function resolveLightboxCaptionPositionAlignment(captionPosition) {
	const pos =
		typeof captionPosition === 'string' && captionPosition.trim() !== ''
			? captionPosition.trim()
			: 'left';
	if (pos === 'right') {
		return { alignSelf: 'flex-end', textAlign: 'right' };
	}
	if (pos === 'center') {
		return { alignSelf: 'center', textAlign: 'center' };
	}
	return { alignSelf: 'flex-start', textAlign: 'left' };
}

/** Horizontal inset for lightbox captions (viewport-based, not tied to image bounds). */
export const MODULA_LIGHTBOX_CAPTION_GUTTER = 'clamp(16px, 4vw, 40px)';

/**
 * CSS custom properties for lightbox caption position (Fancybox v6 `.f-caption`).
 *
 * @param {Object} settings
 * @returns {Record<string, string>}
 */
export function lightboxCaptionPositionCssVars(settings) {
	const { alignSelf, textAlign } = resolveLightboxCaptionPositionAlignment(
		settings?.lightbox?.captionPosition
	);
	return {
		'--modula-lightbox-caption-gutter': MODULA_LIGHTBOX_CAPTION_GUTTER,
		'--modula-lightbox-caption-align': alignSelf,
		'--modula-lightbox-caption-text-align': textAlign,
	};
}

/**
 * Caption align-self for Fancybox caption (flex).
 *
 * @param {Object} settings
 * @returns {'flex-start'|'center'|'flex-end'}
 */
export function lightboxPreviewCaptionAlignSelf(settings) {
	return resolveLightboxCaptionPositionAlignment(
		settings?.lightbox?.captionPosition
	).alignSelf;
}
