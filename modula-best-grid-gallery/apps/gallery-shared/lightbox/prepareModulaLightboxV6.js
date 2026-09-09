/**
 * Shared Fancybox v6 runtime preparation (layout, preview guards, share wiring).
 *
 * @package
 */
import { finalizeLightboxV6Runtime } from './buildLightboxV6Opts';
import { openModulaShare } from './openModulaShare';
import { resolveModulaLightboxCompactToolbar } from './modulaLightboxCompactToolbar';

/**
 * @param {object} [context]
 * @returns {boolean}
 */
export function resolveModulaLightboxIsMobile(context = {}) {
	return (
		context.isMobile ??
		(context.previewViewport === 'mobile' ||
			/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
				typeof navigator !== 'undefined' ? navigator.userAgent : ''
			))
	);
}

/**
 * @param {object} v6Opts
 * @param {{ shareButtonsJson?: string }} runtimeContext
 */
export function wireModulaLightboxShareToolbarClick(v6Opts, runtimeContext) {
	if (runtimeContext.editorPreview) {
		return;
	}

	const toolbarItems = v6Opts.Carousel?.Toolbar?.items;
	if (!toolbarItems?.share) {
		return;
	}

	toolbarItems.share.click = () => {
		openModulaShare({ shareButtonsJson: runtimeContext.shareButtonsJson });
	};
}

/**
 * @param {object} lightboxOpts Fancybox v6 options from lightboxSettingsToFancyboxOpts.
 * @param {object} [context]
 * @param {{ startIndex?: number }} [options]
 * @returns {{
 *   lightboxOpts: object,
 *   v6Opts: object,
 *   previewBackgroundColor: string,
 *   shareButtonsJson: string,
 *   runtimeContext: object,
 *   isMobile: boolean,
 *   userEventHandlers: object,
 * }}
 */
export function prepareModulaLightboxV6(
	lightboxOpts,
	context = {},
	options = {}
) {
	const {
		previewBackgroundColor: _bg,
		previewViewport: _vp,
		shareButtonsJson: _share,
		on: userOn,
		...baseOpts
	} = lightboxOpts || {};

	const isMobile = resolveModulaLightboxIsMobile(context);
	const compactToolbar = resolveModulaLightboxCompactToolbar({
		...context,
		isMobile,
	});

	const mergedOpts = {
		...baseOpts,
	};

	if (typeof options.startIndex === 'number') {
		mergedOpts.startIndex =
			options.startIndex >= 0 ? options.startIndex : 0;
	}

	const slideCount =
		typeof options.slideCount === 'number'
			? options.slideCount
			: Array.isArray(options.slides)
				? options.slides.length
				: 0;

	const v6Opts = finalizeLightboxV6Runtime(mergedOpts, {
		isMobile,
		compactToolbar,
		editorPreview: Boolean(context.editorPreview),
		slideCount,
	});

	if (typeof options.startIndex === 'number') {
		v6Opts.startIndex = options.startIndex >= 0 ? options.startIndex : 0;
	}

	const previewBackgroundColor =
		context.previewBackgroundColor ||
		(typeof _bg === 'string' ? _bg.trim() : '');

	const shareButtonsJson =
		context.shareButtonsJson ||
		(typeof _share === 'string' ? _share : '') ||
		(typeof window !== 'undefined' && window.ModulaShareButtons
			? window.ModulaShareButtons
			: '');

	const runtimeContext = {
		...context,
		previewBackgroundColor,
		shareButtonsJson,
		isMobile,
		compactToolbar,
	};

	return {
		lightboxOpts: mergedOpts,
		v6Opts,
		previewBackgroundColor,
		shareButtonsJson,
		runtimeContext,
		isMobile,
		userEventHandlers: userOn || {},
	};
}
