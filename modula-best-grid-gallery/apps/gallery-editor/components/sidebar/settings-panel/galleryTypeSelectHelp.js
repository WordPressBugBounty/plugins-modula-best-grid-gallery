/**
 * Short visitor-facing blurbs under the gallery-type select (redesign mockup).
 *
 * @param {string} type general.type value
 * @return {string}
 */
import { __ } from '@wordpress/i18n';

const HELP_BY_TYPE = {
	'uniform-grid': __(
		'An even grid crops every photo to the same shape. The others keep each photo’s own shape and fill the space around it.',
		'modula-best-grid-gallery'
	),
	'fit-grid': __(
		'Fit grid keeps each photo’s own shape and fills the row. Other types crop or pack differently.',
		'modula-best-grid-gallery'
	),
	grid: __(
		'Masonry keeps each photo’s own shape and packs the column. Other types crop or align differently.',
		'modula-best-grid-gallery'
	),
	'justified-grid': __(
		'Justified rows share a common height and crop as needed to fill the width.',
		'modula-best-grid-gallery'
	),
	'creative-gallery': __(
		'Creative gallery splits tiles into varied blocks. Spacing and randomness change the rhythm.',
		'modula-best-grid-gallery'
	),
	'custom-grid': __(
		'Custom grid lets you size each tile. Drag handles in the preview to reshape the layout.',
		'modula-best-grid-gallery'
	),
	polaroid: __(
		'Polaroid frames each photo with a chin and optional scatter. Uniform size locks a regular grid.',
		'modula-best-grid-gallery'
	),
	slider: __(
		'Slider shows one or more slides at a time. Open Slider options for motion and captions.',
		'modula-best-grid-gallery'
	),
	showcase: __(
		'Showcase is a portfolio strip: natural photo shapes, a larger center image, and peeks on both sides.',
		'modula-best-grid-gallery'
	),
	video: __(
		'Video gallery focuses on playback. Layout options below adapt to a video-first experience.',
		'modula-best-grid-gallery'
	),
	bnb: __(
		'BnB highlights a hero image with a supporting grid — common for listings and stays.',
		'modula-best-grid-gallery'
	),
	'parallax-masonry': __(
		'Parallax masonry adds depth as visitors scroll. Motion presets live under Gallery layout.',
		'modula-best-grid-gallery'
	),
	story: __(
		'Story presents full-bleed slides with captions. Open Story options for timing and chrome.',
		'modula-best-grid-gallery'
	),
};

/**
 * @param {unknown} type
 * @return {string}
 */
export function getGalleryTypeSelectHelp(type) {
	if (typeof type !== 'string' || type.trim() === '') {
		return '';
	}
	return HELP_BY_TYPE[type.trim()] || '';
}
