/**
 * Gallery types that have a layout component in the layout registry.
 *
 * @package
 */

import { DEFAULT_GALLERY_TYPE } from '../constants/galleryLayoutDefaults';

/**
 * Resolve the component type shared by bootstrap loading and rendering.
 *
 * `fallbackToDefaultTypes` comes from the server bootstrap: the Pro types the settings
 * document marks to render as the default type while Compatible Pro is absent (Freeform,
 * Bento). A config without it (e.g. Pro's album shells) keeps its type.
 *
 * @param {{ type?: string, grid_type?: string, fallbackToDefaultTypes?: string[] }} config
 * @return {string} Available component type.
 */
export function resolveGalleryLayoutType(config) {
	if (
		Array.isArray(config?.fallbackToDefaultTypes) &&
		config.fallbackToDefaultTypes.includes(config.type)
	) {
		return DEFAULT_GALLERY_TYPE;
	}
	const type = config?.type || DEFAULT_GALLERY_TYPE;
	return type === 'grid' && config?.grid_type === 'automatic'
		? 'justified-grid'
		: type;
}

/** @type {Array<string>} */
export const GALLERY_LAYOUT_TYPES = Object.freeze([
	'creative-gallery',
	'justified-grid',
	'custom-grid',
	'freeform',
	'grid',
	'slider',
	'story',
	'uniform-grid',
	'fit-grid',
	'video',
	'bnb',
	'bento',
	'parallax-masonry',
	'polaroid',
	'showcase',
	'template',
]);
