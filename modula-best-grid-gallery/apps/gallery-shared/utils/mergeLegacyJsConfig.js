/**
 * Merge legacy Pro js config keys into derived flat config (non-destructive).
 *
 * @package
 */
import { licensingTruthy } from './licensing';

/**
 * Explicit enable* Off wins; missing flag keeps legacy numeric behaviour.
 *
 * @param {Record<string, unknown>} loading
 * @param {'enableScale'|'enableRotate'|'enableSlide'} key
 * @return {boolean}
 */
function isLoadingEffectToggleOn(loading, key) {
	if (!loading || typeof loading !== 'object') {
		return true;
	}
	if (!Object.prototype.hasOwnProperty.call(loading, key)) {
		return true;
	}
	const flag = loading[key];
	return flag === true || flag === 1 || flag === '1';
}

const LEGACY_MERGE_KEYS = [
	'modula_deeplink',
	'galleryID',
	'customLinkName',
	'filterClick',
	'dropdownFilters',
	'defaultActiveFilter',
	'initLightbox',
	'copyCaptionMobile',
	'lightbox_devices',
	'mobileDoubleClick',
];

/**
 * @param {Object} config Base config from settingsToConfig.
 * @param {Object} legacy Legacy js config from PHP get_jsconfig + filters.
 * @return {Object}
 */
export function mergeLegacyJsConfigIntoConfig(config, legacy) {
	if (!legacy || typeof legacy !== 'object') {
		return config;
	}
	const out = { ...config };
	LEGACY_MERGE_KEYS.forEach((key) => {
		if (
			out[key] === undefined &&
			legacy[key] !== undefined &&
			legacy[key] !== null
		) {
			out[key] = legacy[key];
		}
	});
	if (out.lightbox_devices === undefined && legacy.lightbox_devices) {
		out.lightbox_devices = legacy.lightbox_devices;
	}

	const legacyLightboxOpts =
		legacy.lightboxOpts && typeof legacy.lightboxOpts === 'object'
			? legacy.lightboxOpts
			: null;
	if (legacyLightboxOpts) {
		const nextLightboxOpts = {
			...(out.lightboxOpts && typeof out.lightboxOpts === 'object'
				? out.lightboxOpts
				: {}),
		};
		/*
		 * Do not deep-merge legacy Carousel — PHP slideshow BC may force
		 * `Carousel.infinite = true`. Loop slides is owned by React opts.
		 */
		if (
			legacyLightboxOpts.mzoom &&
			typeof legacyLightboxOpts.mzoom === 'object'
		) {
			nextLightboxOpts.mzoom = {
				...(nextLightboxOpts.mzoom &&
				typeof nextLightboxOpts.mzoom === 'object'
					? nextLightboxOpts.mzoom
					: {}),
				...legacyLightboxOpts.mzoom,
			};
		}
		const legacyElevateTpl =
			legacyLightboxOpts.Toolbar?.items?.elevateZoom?.tpl;
		if (typeof legacyElevateTpl === 'string' && legacyElevateTpl !== '') {
			const carousel = {
				...(nextLightboxOpts.Carousel &&
				typeof nextLightboxOpts.Carousel === 'object'
					? nextLightboxOpts.Carousel
					: {}),
			};
			const toolbar = {
				...(carousel.Toolbar && typeof carousel.Toolbar === 'object'
					? carousel.Toolbar
					: {}),
			};
			toolbar.items = {
				...(toolbar.items && typeof toolbar.items === 'object'
					? toolbar.items
					: {}),
				elevateZoom: {
					...(toolbar.items?.elevateZoom &&
					typeof toolbar.items.elevateZoom === 'object'
						? toolbar.items.elevateZoom
						: {}),
					tpl: legacyElevateTpl,
				},
			};
			carousel.Toolbar = toolbar;
			nextLightboxOpts.Carousel = carousel;
		}
		out.lightboxOpts = nextLightboxOpts;
	}

	return out;
}

/**
 * @param {unknown} value
 * @param {number}  fallback
 * @return {number}
 */
function parseSignedInt(value, fallback = 0) {
	const n = Number.parseInt(value, 10);
	return Number.isFinite(n) ? n : fallback;
}

/**
 *
 * @param {Object} settings Grouped settings.
 * @return {Object}
 */
export function groupedUiSettingsToConfig(settings) {
	const filters = settings?.filters || {};
	const pagination = settings?.pagination || {};
	const loading = settings?.loadingEffects || {};
	const deeplink = settings?.deeplink || {};
	const download = settings?.download || {};
	const zoom = settings?.zoom || {};
	const protection = settings?.protection || {};
	const licensing = settings?.licensing || {};
	const exif = settings?.exif || {};
	const comments = settings?.comments || {};

	const filterLinkColor =
		filters.filterLinkColor || filters.filterColor || '';
	const filterLinkHoverColor =
		filters.filterLinkHoverColor || filters.filterActiveColor || '';
	const filterTextAlignment =
		filters.filterTextAlignment || filters.filterAlign || 'none';
	const filterPositioning =
		filters.filterPositioning || filters.filterPosition || 'top';

	return {
		filterLinkColor,
		filterLinkHoverColor,
		filterTextAlignment,
		filterPositioning,
		/** @deprecated Legacy flat aliases — prefer v2 keys above. */
		filterColor: filterLinkColor,
		filterActiveColor: filterLinkHoverColor,
		filterBackgroundColor: filters.filterBackgroundColor || '',
		filterActiveBackgroundColor: filters.filterActiveBackgroundColor || '',
		filterAlign: filterTextAlignment,
		filterPosition: filterPositioning,
		hideAllFilter: !!filters.hideAllFilter,
		showFilterCount: filters.showFilterCount !== false,
		allFilterLabel:
			typeof filters.allFilterLabel === 'string' &&
			filters.allFilterLabel.trim() !== ''
				? filters.allFilterLabel.trim()
				: 'All',
		dropdownFilters: !!filters.dropdownFilters,
		filterClick: filters.filterClick,
		defaultActiveFilter: filters.defaultActiveFilter || '',
		enableMobileDropdownFilters: !!filters.enableMobileDropdownFilters,
		enableCollapsibleFilters: !!filters.enableCollapsibleFilters,
		collapsibleActionText:
			typeof filters.collapsibleActionText === 'string' &&
			filters.collapsibleActionText.trim() !== ''
				? filters.collapsibleActionText.trim()
				: 'Filter by',
		paginationColor: pagination.paginationColor || '',
		activePaginationColor: pagination.activePaginationColor || '',
		paginationPosition: pagination.paginationPosition || '',
		paginationNumber: pagination.paginationNumber,
		enableLoadMore: !!pagination.enableLoadMore,
		loadedScale: isLoadingEffectToggleOn(loading, 'enableScale')
			? parseInt(loading.loadedScale ?? 100, 10) || 100
			: 100,
		loadedRotate: isLoadingEffectToggleOn(loading, 'enableRotate')
			? parseSignedInt(loading.loadedRotate, 0)
			: 0,
		loadedHSlide: isLoadingEffectToggleOn(loading, 'enableSlide')
			? parseSignedInt(loading.loadedHSlide, 0)
			: 0,
		loadedVSlide: isLoadingEffectToggleOn(loading, 'enableSlide')
			? parseSignedInt(loading.loadedVSlide, 0)
			: 0,
		modulaDeeplink: !!deeplink.modulaDeeplink,
		customLinkName: deeplink.customLinkName || '',
		enableDownload: !!download.enableDownload,
		enableZoom: !!zoom.enableZoom,
		zoomOnHover: !!zoom.zoomOnHover,
		protectionEnabled: !!protection.protection,
		blurProtection: !!protection.blurProtection,
		imageLicensing:
			typeof licensing.imageLicensing === 'string'
				? licensing.imageLicensing
				: 'none',
		displayWithDescription: licensingTruthy(
			licensing.displayWithDescription
		),
		showOnLightbox: licensingTruthy(licensing.showOnLightbox),
		enableExif: !!exif.enableExif,
		enableComments: !!comments.toggleComments,
		commentsStartCollapsed: !!comments.startCollapsed,
	};
}
