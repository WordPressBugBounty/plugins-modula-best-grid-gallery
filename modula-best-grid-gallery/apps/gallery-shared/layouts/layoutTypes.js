/**
 * Gallery types that have a layout component in the layout registry.
 *
 * @package
 */

import { DEFAULT_GALLERY_TYPE } from '../constants/galleryLayoutDefaults';

/**
 * Resolve the component type shared by bootstrap loading and rendering.
 *
 * @param {{ type?: string, grid_type?: string }} config
 * @returns {string}
 */
export function resolveGalleryLayoutType(config) {
	const type = config?.type || DEFAULT_GALLERY_TYPE;
	return type === 'grid' && config?.grid_type === 'automatic'
		? 'justified-grid'
		: type;
}

/** @type {readonly string[]} */
export const GALLERY_LAYOUT_TYPES = Object.freeze([
	'creative-gallery',
	'justified-grid',
	'custom-grid',
	'grid',
	'slider',
	'story',
	'uniform-grid',
	'fit-grid',
	'video',
	'bnb',
	'parallax-masonry',
	'polaroid',
	'showcase',
	'template',
]);
