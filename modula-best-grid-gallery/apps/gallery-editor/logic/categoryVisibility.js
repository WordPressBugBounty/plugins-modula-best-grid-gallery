/**
 * Which top-level settings categories appear in the sidebar for the current gallery type.
 *
 * Gallery-type matrix (high level — field-level rules remain in form-rules.json):
 * - **grid / uniform / justified / parallax / creative / custom**: Gallery & layout (general + layout + responsive),
 *   lightbox, filters, pagination, etc.; Layout fields use gutters/dimensions per type.
 * - **slider**: All `slider` schema fields render under **Gallery & layout** (with general / layout); **Playback** is only **slideshow** timing.
 *   Style hub is available (corner radius / border / shadow apply to carousel slides). Loading effects and Hover effects hubs stay hidden.
 *   Layout grid fields stay hidden for slider where rules say so — empty group cards are not rendered.
 * - **video**: **Video** category for Video type and mixed image galleries (hidden for story/slider). Video type shows playlist + play icon + autoplay thumbnail; mixed types show lightbox autoplay/loop, play icon, and hover preview.
 * - **slider / story / parallax-masonry / bnb / video**: Pagination hub item and fields hidden; visitor pagination chrome off.
 * - **creative-gallery**: Infinite scroll hidden (fixed packery height); numbered pages / load more only.
 * - **creative-gallery / bnb / story**: Responsive hub hidden (fixed featured / packery / fullscreen story).
 * - **slider**: Responsive hub shows tablet/mobile slides-to-show/scroll (nested under enableResponsive); column fields stay hidden.
 * - **polaroid**: Infinite scroll hidden when Uniform size is off (packery / fixed height); allowed when Uniform size is on.
 * - **polaroid**: Responsive hub only when Uniform size is on; `general.height` only when Uniform size is off.
 * - **slider / story / parallax-masonry / bnb / video**: Filters category hidden; gallery filter list cleared on type change.
 * - **slider / story / video**: Lightbox category hidden; tile lightbox is forced off at
 *   runtime (`settingsToConfig` / `isGalleryTypeWithoutLightbox`) without clearing the saved
 *   `lightbox.lightbox` value, so returning to Masonry/Creative keeps the previous click mode.
 * - **showcase**: Lightbox category visible like other tile layouts; click mode comes from the
 *   shared lightbox settings (not a Showcase-only click-behavior control).
 * - **video**: Responsive hub toggle and column breakpoints hidden (video layout is a single player + playlist, not a multi-column grid).
 * - **story**: Style border / radius / shadow fields hidden (fullscreen slides; frame chrome does not apply). Custom CSS stays available.
 * - **video / story / slider**: Hover effects hub drill hidden (video player UI / Instagram-style story captions / carousel slides; hover treatments do not apply).
 * - **parallax-masonry / story / slider / video**: Loading effects hub hidden (layout owns motion; story/slider are fullscreen or carousel slides; video is player + playlist).
 * - **parallax-masonry**: Captions stay inside-image only (moving photo wall).
 * - **video**: Shuffle on load hidden (playlist order is intentional; PHP shuffle permit list excludes video).
 * - **video**: Protection keeps Password protect only; Watermark, Image licensing, and Image Guardian hub items hidden.
 * - **video**: Advanced category hidden (EXIF, Zoom, Deeplink, Instagram, Performance, Image proofing).
 * - **video**: Captions & titles hub hidden (VideoLayout has no grid caption placement; hover is already off).
 * - **video**: Interaction category hidden (Download, Social, Comments). Video layout has no lightbox share,
 *   no tile social chrome / collapsible share button, and no meaningful download ZIP.
 */

import { evaluateWhen } from './fieldVisibility';
import { getModulaSettingsEditorConfig } from '../config/modulaSettingsEditorConfig';
import { resolveProGateLock } from './proGateLock';

const VIDEO_EXTENSION_SLUG = 'modula-video';

/**
 * @param {{ name: string, visibleWhen?: object }}  category
 * @param {Record<string, Record<string, unknown>>} groupedValues TanStack form values (grouped shape).
 * @return {boolean}
 */
export function isCategoryVisible(category, groupedValues) {
	if (
		category.visibleWhen &&
		!evaluateWhen(category.visibleWhen, groupedValues)
	) {
		return false;
	}
	if (category.name === 'video') {
		const { allowed } = resolveProGateLock(
			{ kind: 'requiresExtension', extensionSlug: VIDEO_EXTENSION_SLUG },
			getModulaSettingsEditorConfig()
		);
		if (!allowed) {
			return false;
		}
	}
	return true;
}

/**
 * @param {Array<{ name: string, visibleWhen?: object }>} categories
 * @param {Record<string, Record<string, unknown>>}       groupedValues
 * @return {typeof categories}
 */
export function getVisibleCategories(categories, groupedValues) {
	return categories.filter((c) => isCategoryVisible(c, groupedValues));
}
