/**
 * Layout registry — sync components for settings-editor preview.
 * Do not import from the visitor gallery bundle.
 *
 * @package
 */

import { GALLERY_LAYOUT_TYPES } from './layoutTypes';
import CreativeGalleryLayout from './CreativeGalleryLayout';
import JustifiedGridLayout from './JustifiedGridLayout';
import CustomGridLayout from './CustomGridLayout';
import MasonryLayout from './MasonryLayout';
import SliderLayout from './SliderLayout';
import StoryLayout from './StoryLayout';
import FitGridLayout from './FitGridLayout';
import UniformGridLayout from './UniformGridLayout';
import VideoLayout from './VideoLayout';
import BnbLayout from './BnbLayout';
import ParallaxMasonryLayout from './ParallaxMasonryLayout';
import PolaroidGalleryLayout from './PolaroidGalleryLayout';
import ShowcaseLayout from './ShowcaseLayout';
import TemplateLayout from './template/TemplateLayout';
import BaseLayout from './BaseLayout';

/** @type {Record<string, import('react').ComponentType>} */
const eagerByType = {
	'creative-gallery': CreativeGalleryLayout,
	'justified-grid': JustifiedGridLayout,
	'custom-grid': CustomGridLayout,
	grid: MasonryLayout,
	slider: SliderLayout,
	story: StoryLayout,
	'uniform-grid': UniformGridLayout,
	'fit-grid': FitGridLayout,
	video: VideoLayout,
	bnb: BnbLayout,
	'parallax-masonry': ParallaxMasonryLayout,
	polaroid: PolaroidGalleryLayout,
	showcase: ShowcaseLayout,
	template: TemplateLayout,
};

for (const type of GALLERY_LAYOUT_TYPES) {
	if (!eagerByType[type]) {
		throw new Error(`Layout registry: missing eager layout for "${type}"`);
	}
}

/** @type {Record<string, import('react').ComponentType>} */
export const EAGER_LAYOUTS = Object.fromEntries(
	GALLERY_LAYOUT_TYPES.map((type) => [type, eagerByType[type]])
);

/**
 * @param {string} type Gallery layout type from config.
 * @return {import('react').ComponentType}
 */
export function getEagerLayout(type) {
	return EAGER_LAYOUTS[type] ?? BaseLayout;
}

/**
 * @return {string[]} Sorted eager registry keys.
 */
export function listEagerLayoutTypes() {
	return Object.keys(EAGER_LAYOUTS).sort();
}
