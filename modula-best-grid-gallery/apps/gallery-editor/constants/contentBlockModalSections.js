/**
 * Vertical nav + section copy for content block editing in the unified modal.
 */
import { __ } from '@wordpress/i18n';
import { edit, typography, color } from '@wordpress/icons';

/** @type {{ name: string, title: string, description: string, icon: import('@wordpress/icons').Icon }[]} */
export const CONTENT_BLOCK_MODAL_SECTIONS = [
	{
		name: 'content',
		title: __('Content', 'modula-best-grid-gallery'),
		description: __(
			'Headline, subtitle, and optional formatted copy for this tile.',
			'modula-best-grid-gallery'
		),
		icon: edit,
	},
	{
		name: 'spacing-font',
		title: __('Spacing & font', 'modula-best-grid-gallery'),
		description: __(
			'Padding inside the tile and the typeface used for text.',
			'modula-best-grid-gallery'
		),
		icon: typography,
	},
	{
		name: 'colors',
		title: __('Colors', 'modula-best-grid-gallery'),
		description: __(
			'Tile background color, optional background image with overlay, and text color.',
			'modula-best-grid-gallery'
		),
		icon: color,
	},
];
