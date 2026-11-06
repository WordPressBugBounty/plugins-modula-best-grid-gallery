/**
 * Which top-level settings categories appear in the sidebar for the current gallery type.
 *
 * Gallery-type matrix (high level — field-level rules remain in form-rules.json):
 * - **grid / uniform / justified / parallax / creative / custom**: Gallery & layout (general + layout + responsive),
 *   lightbox, filters, pagination, etc.; Layout fields use gutters/dimensions per type.
 * - **slider**: All `slider` schema fields render under **Gallery & layout** (with general / layout); **Playback** is only **slideshow** timing.
 *   Style hub is available (corner radius / border / shadow apply to carousel slides). Loading effects and Hover effects hubs stay hidden.
 *   Layout grid fields stay hidden for slider where rules say so — empty group cards are not rendered.
 * - **video**: **Video** category for Video type and mixed image galleries (hidden for story/slider). It needs the Video extension (`requiresExtension` on the category). Video type shows playlist + play icon + autoplay thumbnail; mixed types show lightbox autoplay/loop, play icon, and hover preview.
 * - **slider / story / showcase / template / freeform / parallax-masonry / bnb / video**: Pagination hub item and fields hidden;
 *   visitor pagination chrome off (`GALLERY_TYPES_WITHOUT_PAGINATION`).
 * - **creative-gallery**: Infinite scroll hidden on the Classic tiles engine (fixed packery height);
 *   numbered pages / load more only. The Mosaic engine (general.creativeEngine) flows rows and allows it.
 * - **creative-gallery / bnb / story**: Responsive hub hidden (fixed featured / packery / fullscreen story).
 * - **slider**: Responsive hub shows tablet/mobile slides-to-show/scroll (nested under enableResponsive); column fields stay hidden.
 * - **polaroid**: Infinite scroll hidden when Uniform size is off (packery / fixed height); allowed when Uniform size is on.
 * - **polaroid**: Responsive hub only when Uniform size is on; `general.height` only when Uniform size is off.
 * - **slider / story / showcase / template / freeform / parallax-masonry / bnb / video**: Filters category hidden;
 *   gallery filter list cleared on type change (`GALLERY_TYPES_WITHOUT_FILTERS`).
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
 * - **video**: Instagram and Proofing categories hidden; EXIF, Zoom and Deeplink live in the hidden Lightbox category.
 * - **video**: Captions & titles hub hidden (VideoLayout has no grid caption placement; hover is already off).
 * - **video**: Interaction category hidden (Download, Social, Comments). Video layout has no lightbox share,
 *   no tile social chrome / collapsible share button, and no meaningful download ZIP.
 */

import { evaluateWhen } from './fieldVisibility';
import { getModulaSettingsEditorConfig } from '../config/modulaSettingsEditorConfig';
import { resolveProGateLock } from './proGateLock';

/**
 * The gate of a category with `requiresExtension` (Video): it shows only when
 * that extension is available and enabled. Lite locks it (`needs_pro`).
 *
 * @param {{ requiresExtension?: string }} category
 * @param {Object}                         editor   Editor config.
 * @return {ReturnType<typeof resolveProGateLock>} Allowed for a category without an extension.
 */
export function resolveCategoryExtensionGate(category, editor) {
	const slug =
		typeof category.requiresExtension === 'string'
			? category.requiresExtension.trim()
			: '';
	if (slug === '') {
		return { allowed: true };
	}
	return resolveProGateLock(
		{ kind: 'requiresExtension', extensionSlug: slug },
		editor
	);
}

/**
 * @param {{ visibleWhen?: object }}                category
 * @param {Record<string, Record<string, unknown>>} groupedValues TanStack form values (grouped shape).
 * @return {boolean} True when the category has no `visibleWhen` rule, or it passes.
 */
export function passesCategoryVisibleWhen(category, groupedValues) {
	return (
		!category.visibleWhen ||
		evaluateWhen(category.visibleWhen, groupedValues)
	);
}

/**
 * @param {{ name: string, visibleWhen?: object, requiresExtension?: string }} category
 * @param {Record<string, Record<string, unknown>>}                            groupedValues TanStack form values (grouped shape).
 * @return {boolean} True when the category's rule and extension gate allow it.
 */
export function isCategoryVisible(category, groupedValues) {
	return (
		passesCategoryVisibleWhen(category, groupedValues) &&
		resolveCategoryExtensionGate(category, getModulaSettingsEditorConfig())
			.allowed
	);
}

/**
 * @param {Array<{ name: string, visibleWhen?: object }>} categories
 * @param {Record<string, Record<string, unknown>>}       groupedValues
 * @return {typeof categories}
 */
export function getVisibleCategories(categories, groupedValues) {
	return categories.filter((c) => isCategoryVisible(c, groupedValues));
}
