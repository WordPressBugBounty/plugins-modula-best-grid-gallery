/**
 * When gallery tiles are too small for inline/hover title + caption, use a popover.
 *
 * Thresholds target dense justified / masonry rows where overlay or below-image
 * copy crowds or hides the photo (not only tiny stamps).
 *
 * @package
 */

/** Shortest side (or height) below this → compact caption mode (schema default). */
export const COMPACT_CAPTION_MIN_SIDE_PX = 240;

/** Width alone below this → compact (skinny justified / dense rows). */
export const COMPACT_CAPTION_MAX_WIDTH_PX = 320;

/** Area below this (px²) → compact even when both sides clear the min side. */
export const COMPACT_CAPTION_MAX_AREA_PX = 90000;

/**
 * Extra slack when leaving compact mode — prevents below-image measure feedback loops.
 * (Hide caption → image area grows → leave compact → show caption → shrink → enter again.)
 */
export const COMPACT_CAPTION_EXIT_SLACK_PX = 48;

/** Allowed range for captions.compactCaptionMinSize (matches settings-v2-document). */
export const COMPACT_CAPTION_MIN_SIZE_SETTING_MIN = 80;
export const COMPACT_CAPTION_MIN_SIZE_SETTING_MAX = 480;

/**
 * Clamp the editor/runtime min-size setting to the schema range.
 *
 * @param {unknown} raw
 * @return {number}
 */
export function resolveCompactCaptionMinSize(raw) {
	const n = parseInt(raw, 10);
	if (!Number.isFinite(n)) {
		return COMPACT_CAPTION_MIN_SIDE_PX;
	}
	return Math.min(
		COMPACT_CAPTION_MIN_SIZE_SETTING_MAX,
		Math.max(COMPACT_CAPTION_MIN_SIZE_SETTING_MIN, n)
	);
}

/**
 * Derive width / side / area limits from the configured shortest-side threshold,
 * preserving the relative ratios of the built-in defaults.
 *
 * @param {number} [minSidePx]
 * @return {{ minSide: number, maxWidth: number, maxArea: number }}
 */
export function resolveCompactCaptionThresholds(minSidePx) {
	const minSide = resolveCompactCaptionMinSize(minSidePx);
	const scale = minSide / COMPACT_CAPTION_MIN_SIDE_PX;
	return {
		minSide,
		maxWidth: Math.round(COMPACT_CAPTION_MAX_WIDTH_PX * scale),
		maxArea: Math.round(COMPACT_CAPTION_MAX_AREA_PX * scale * scale),
	};
}

/**
 * @param {number} widthPx
 * @param {number} heightPx
 * @param {{ stickyCompact?: boolean, minSize?: number }} [options]
 * @return {boolean}
 */
export function isCompactCaptionTileSize(widthPx, heightPx, options = {}) {
	const w = Math.floor(Number(widthPx) || 0);
	const h = Math.floor(Number(heightPx) || 0);
	if (w <= 0 && h <= 0) {
		return false;
	}

	const { minSide, maxWidth, maxArea } = resolveCompactCaptionThresholds(
		options.minSize
	);
	const sticky = Boolean(options.stickyCompact);
	const widthLimit = sticky
		? maxWidth + COMPACT_CAPTION_EXIT_SLACK_PX
		: maxWidth;
	const sideLimit = sticky
		? minSide + COMPACT_CAPTION_EXIT_SLACK_PX
		: minSide;
	const areaLimit = sticky
		? maxArea +
			COMPACT_CAPTION_EXIT_SLACK_PX * COMPACT_CAPTION_EXIT_SLACK_PX * 4
		: maxArea;

	if (w > 0 && w < widthLimit) {
		return true;
	}
	if (h > 0 && h < sideLimit) {
		return true;
	}
	if (w > 0 && h > 0 && Math.min(w, h) < sideLimit) {
		return true;
	}
	if (w > 0 && h > 0 && w * h < areaLimit) {
		return true;
	}
	return false;
}

/**
 * @param {unknown} title
 * @param {unknown} description
 * @param {{ hideTitle?: boolean, hideDescription?: boolean }} [flags]
 * @return {boolean}
 */
export function itemHasCaptionText(title, description, flags = {}) {
	const showTitle = !flags.hideTitle && String(title || '').trim() !== '';
	const showDescription =
		!flags.hideDescription && String(description || '').trim() !== '';
	return showTitle || showDescription;
}

/**
 * Which caption slots Markup should paint.
 *
 * Overlay title/caption belong on the visitor gallery and in Hover Effect
 * Preview. The settings-editor canvas strips hover-builder classes (no
 * on-hover CSS), so overlay copy must not paint there — it would sit on the
 * image at rest. Below-image slots stay. `previewAdminToolbar` is not a
 * title/caption gate (visitor socials still use it).
 *
 * @param {Object}  opts
 * @param {boolean} opts.showTitle
 * @param {boolean} opts.showDescription
 * @param {boolean} [opts.suppressOverlayText] Story/slider owns caption chrome.
 * @param {boolean} [opts.useCaptionPopover] Compact-tile popover owns the copy.
 * @param {boolean} [opts.stripHoverBuilderClasses] Settings-editor canvas: hide overlay slots.
 * @param {boolean} [opts.previewAdminToolbar] Ignored for title/caption slots.
 * @return {{ hasOverlayTitle: boolean, hasOverlayDescription: boolean, hasBelowTitle: boolean, hasBelowDescription: boolean }}
 */
export function resolveGalleryItemCaptionChrome(opts = {}) {
	const showTitle = Boolean(opts.showTitle);
	const showDescription = Boolean(opts.showDescription);
	const suppressOverlayText = Boolean(opts.suppressOverlayText);
	const useCaptionPopover = Boolean(opts.useCaptionPopover);
	const stripHoverBuilderClasses = Boolean(opts.stripHoverBuilderClasses);
	const overlayOk =
		!suppressOverlayText &&
		!useCaptionPopover &&
		!stripHoverBuilderClasses;
	return {
		hasOverlayTitle: overlayOk && showTitle,
		hasOverlayDescription: overlayOk && showDescription,
		hasBelowTitle: showTitle && !useCaptionPopover,
		hasBelowDescription: showDescription && !useCaptionPopover,
	};
}

/**
 * @param {Element|null|undefined} element
 * @return {{ width: number, height: number }}
 */
export function readElementContentBox(element) {
	if (!element || typeof element.getBoundingClientRect !== 'function') {
		return { width: 0, height: 0 };
	}
	const rect = element.getBoundingClientRect();
	return {
		width: Math.round(rect.width),
		height: Math.round(rect.height),
	};
}
