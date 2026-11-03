/**
 * The static bar's settings on the editor canvas (Lite ticket 96), as the
 * custom properties `filters-preview-canvas-bar` reads. The gallery's dynamic
 * filter CSS (`buildFilterBarDynamicCss`) doesn't reach the canvas root, and
 * the canvas draws on the dark stage: the visitor's default ink gives way to
 * the stage inks there, as in the design.
 *
 * @package
 */
import { flexAlignValue } from '../utils/buildFilterBarDynamicCss';

/** Opaque black, in the spellings a colour setting can hold. */
const OPAQUE_BLACK =
	/^(?:black|#000(?:f|000|000ff)?|rgba?\(0,0,0(?:,(?:1(?:\.0+)?|100%))?\))$/;

/**
 * The design's colour fields default to black and draw it in the stage ink,
 * so black counts as no colour, as an empty setting does.
 *
 * @param {unknown} value A colour setting.
 * @return {string} The colour the bar draws on the stage, or '' for the stage ink.
 */
function colorOnStage(value) {
	const color = typeof value === 'string' ? value.trim() : '';
	const compact = color.toLowerCase().replace(/\s*[,/]\s*|\s+/g, ',');
	return OPAQUE_BLACK.test(compact) ? '' : color;
}

/**
 * @param {Object|undefined} filtersSettings The gallery's `filters.*`.
 * @return {Record<string, string>} Custom properties for the bar's root.
 */
export function canvasFiltersPreviewBarStyle(filtersSettings) {
	const properties = {
		'--modula-canvas-filters-align': flexAlignValue(
			filtersSettings?.filterTextAlignment
		),
		'--modula-canvas-filters-link': colorOnStage(
			filtersSettings?.filterLinkColor
		),
		'--modula-canvas-filters-current': colorOnStage(
			filtersSettings?.filterLinkHoverColor
		),
	};
	// An unset property falls back to the stage's look in the stylesheet.
	return Object.fromEntries(
		Object.entries(properties).filter(([, value]) => value !== '')
	);
}
