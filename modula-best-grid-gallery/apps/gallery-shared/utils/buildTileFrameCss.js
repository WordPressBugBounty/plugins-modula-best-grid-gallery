/**
 * Style frame CSS (border, corner radius, shadow) on gallery tile shells.
 *
 * @package
 */

/**
 * Resolved Style frame values (story already zeroed by the caller).
 *
 * @typedef {Object} TileFrame
 * @property {string} galleryType    Gallery type slug.
 * @property {number} borderSizePx   Border width in whole pixels.
 * @property {number} borderRadiusPx Corner radius in whole pixels.
 * @property {number} shadowSize     Shadow blur in pixels.
 * @property {string} borderColor    Border color.
 * @property {string} shadowColor    Shadow color.
 */

/**
 * @param {string}    root  Scoped gallery root selector (e.g. `#modula-12`).
 * @param {TileFrame} frame Resolved frame values.
 * @return {string} CSS rules; empty when no frame value applies.
 */
export function buildTileFrameCss(root, frame) {
	const {
		galleryType,
		borderSizePx,
		borderRadiusPx,
		shadowSize,
		borderColor,
		shadowColor,
	} = frame;
	/*
	 * Story/slider slides are carousel pages; global tile border/shadow/radius is for grid tiles.
	 * Without this guard, `#modula-N .modula-item` (ID specificity) overrides slide chrome.
	 * Story also zeros these in settingsToConfig so Uniform → Story cannot leak frame chrome.
	 * Slider Style frame is applied separately onto the image card / media shell.
	 */
	const carouselSlideGuard =
		galleryType === 'story' || galleryType === 'slider'
			? ':not(.f-carousel__slide)'
			: '';
	const tileFrameSelectors = [
		`${root} .modula-item${carouselSlideGuard}`,
		`${root} .modula-justified-tile`,
		`${root} .modula-bnb-hero`,
		`${root} .modula-bnb-featured-cell`,
		`${root} .modula-bnb-grid-cell`,
		`${root} .modula-template__slot`,
		// Freeform's overflow:hidden shell rounds and clips its content but never its own shadow.
		`${root} .modula-freeform__tile`,
	].join(',');
	const nestedTileFrameResetSelectors = [
		`${root} .modula-item-tiled > .modula-item`,
		`${root} .modula-justified-tile > .modula-item`,
		`${root} .modula-bnb-hero > .modula-item`,
		`${root} .modula-bnb-featured-cell > .modula-item`,
		`${root} .modula-bnb-grid-cell > .modula-item`,
	].join(',');
	const hasTileShadow = shadowSize > 0 && galleryType !== 'polaroid';

	let css = '';
	// Templates define their own rounding in `_template.scss`; override it from Style->borderRadius
	// (including the zero case) so preview matches what the editor controls.
	if (galleryType === 'template') {
		css += `${root} .modula-template__slot{border-radius:${borderRadiusPx}px;}`;
	}
	if (borderSizePx > 0) {
		css += `${tileFrameSelectors}{border:${borderSizePx}px solid ${borderColor};box-sizing:border-box;}`;
	}
	if (borderRadiusPx > 0) {
		css += `${tileFrameSelectors}{border-radius:${borderRadiusPx}px;}`;
	}
	if (hasTileShadow) {
		css += `${tileFrameSelectors}{box-shadow:${shadowColor} 0 0 ${Math.round(
			shadowSize
		)}px;}`;
		/*
		 * BnB frame chrome lives on the cell; overflow:visible keeps box-shadow
		 * from being clipped. Image clipping is handled on nested items below.
		 */
		css += `${root} .modula-bnb-hero,${root} .modula-bnb-featured-cell,${root} .modula-bnb-grid-cell{overflow:visible;}`;
	}
	if (borderSizePx > 0 || borderRadiusPx > 0 || hasTileShadow) {
		css += `${nestedTileFrameResetSelectors}{border:none;box-shadow:none;border-radius:0;}`;
	}
	/*
	 * BnB: cell stays overflow:visible for shadow, so clip media/overlays on
	 * nested content with the inner radius (outer radius minus border width).
	 */
	if (borderRadiusPx > 0) {
		const bnbInnerRadiusPx = Math.max(0, borderRadiusPx - borderSizePx);
		const bnbClipSelectors = [
			`${root} .modula-bnb-hero > .modula-item`,
			`${root} .modula-bnb-featured-cell > .modula-item`,
			`${root} .modula-bnb-grid-cell > .modula-item`,
			`${root} .modula-bnb-lightbox-only-overlay`,
			`${root} .modula-bnb-featured-cell--has-more::after`,
		].join(',');
		css += `${bnbClipSelectors}{border-radius:${bnbInnerRadiusPx}px;overflow:hidden;}`;
	}
	/* Polaroid: frame shadow/border live on `.modula-polaroid-frame`, not the slot shell. */
	if (galleryType === 'polaroid') {
		css += `${root} .modula-polaroid-slot{box-shadow:none !important;border:none !important;border-radius:0 !important;}`;
	}
	return css;
}
