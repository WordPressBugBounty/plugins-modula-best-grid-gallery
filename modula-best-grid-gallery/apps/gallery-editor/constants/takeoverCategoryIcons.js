/**
 * Main sidebar category icons — @wordpress/icons only (WP admin bundle).
 * Keys match SETTINGS_EDITOR_CATEGORIES[].name
 *
 * Semantic choices use one visual family (24px outline glyphs). @wordpress/icons
 * has no pointer/cursor; `link` reads as click-through visitor actions.
 */
import {
	code,
	grid,
	image,
	link,
	settings,
	shield,
	tag,
	video,
} from '@wordpress/icons';

export const TAKEOVER_CATEGORY_ICONS = {
	layout: grid,
	lightbox: image,
	// Category filter bar (narrow visible images), not image-processing filters.
	filters: tag,
	interaction: link,
	protection: shield,
	advanced: settings,
	video,
	custom: code,
};
