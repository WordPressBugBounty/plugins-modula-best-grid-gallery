/**
 * Layout registry — lazy loaders for the visitor gallery.
 * Sync eager components live in `./eagerLayouts` (settings-editor preview only).
 *
 * @package
 */

import { GALLERY_LAYOUT_TYPES } from './layoutTypes';

/** @type {Record<string, () => Promise<{ default: import('react').ComponentType }>>} */
const lazyByType = {
	'creative-gallery': () => import('./CreativeGalleryLayout'),
	'justified-grid': () => import('./JustifiedGridLayout'),
	'custom-grid': () => import('./CustomGridLayout'),
	grid: () => import('./MasonryLayout'),
	slider: () => import('./SliderLayout'),
	story: () => import('./StoryLayout'),
	'uniform-grid': () => import('./UniformGridLayout'),
	'fit-grid': () => import('./FitGridLayout'),
	video: () => import('./VideoLayout'),
	bnb: () => import('./BnbLayout'),
	'parallax-masonry': () => import('./ParallaxMasonryLayout'),
	polaroid: () => import('./PolaroidGalleryLayout'),
	showcase: () => import('./ShowcaseLayout'),
	template: () => import('./template/TemplateLayout'),
};

for (const type of GALLERY_LAYOUT_TYPES) {
	if (typeof lazyByType[type] !== 'function') {
		throw new Error(`Layout registry: missing lazy loader for "${type}"`);
	}
}

const LAYOUT_LOADERS = Object.fromEntries(
	GALLERY_LAYOUT_TYPES.map((type) => [type, lazyByType[type]])
);

const loadBaseLayout = () => import('./BaseLayout');

/**
 * @param {string} type Gallery layout type from config.
 * @return {() => Promise<{ default: import('react').ComponentType }>}
 */
export function getLayoutLoader(type) {
	return LAYOUT_LOADERS[type] ?? loadBaseLayout;
}

/**
 * @return {string[]} Sorted lazy registry keys.
 */
export function listLazyLayoutTypes() {
	return Object.keys(LAYOUT_LOADERS).sort();
}

export { GALLERY_LAYOUT_TYPES };

export default getLayoutLoader;
