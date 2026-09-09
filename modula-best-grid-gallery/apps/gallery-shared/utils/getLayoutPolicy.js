/**
 * Layout policy — capabilities and derived values for a gallery type.
 *
 * @package
 */

import {
	isGalleryTypeWithoutFilters,
	isGalleryTypeWithoutHoverEffects,
	isGalleryTypeWithoutImageGuardian,
	isGalleryTypeWithoutLightbox,
	isGalleryTypeWithoutLoadingEffects,
	isGalleryTypeWithoutPagination,
} from '../constants/galleryLayoutDefaults';
import { clampMasonryGalleryWidth } from './clampMasonryGalleryWidth';
import {
	galleryTypeSupportsBelowImageCaptions,
	galleryTypeSupportsCompactCaptionPopover,
} from './captionPlacement';
import { normalizeFitGridImageAlign } from './fitGridImageAlign';
import { isImageFocusSupportedForGalleryType } from './imageFocusLayoutSupport';
import {
	POLAROID_DEFAULT_SHADOW_COLOR,
	POLAROID_DEFAULT_SHADOW_SIZE,
} from './polaroidFrameShadow';
import { resolveUniformGridTileAspect } from './uniformGridTileAspect';

/**
 * @param {unknown} groupedSettings Grouped v2 settings.
 * @return {string} Gallery type, or empty string.
 */
function resolveGalleryType(groupedSettings) {
	const general =
		groupedSettings &&
		typeof groupedSettings === 'object' &&
		groupedSettings.general &&
		typeof groupedSettings.general === 'object'
			? groupedSettings.general
			: {};
	return typeof general.type === 'string' ? general.type : '';
}

/**
 * @param {string}                                 type            Gallery type.
 * @param {Record<string, unknown>|null|undefined} groupedSettings Grouped v2 settings.
 * @return {string} CSS aspect-ratio value.
 */
function resolveTileAspectCss(type, groupedSettings) {
	if (type === 'uniform-grid' || type === 'fit-grid') {
		const layout =
			groupedSettings &&
			typeof groupedSettings === 'object' &&
			groupedSettings.layout &&
			typeof groupedSettings.layout === 'object'
				? groupedSettings.layout
				: {};
		return resolveUniformGridTileAspect(
			layout.uniformGridTileAspect,
			layout.uniformGridTileAspectCustom
		).css;
	}
	if (type === 'story') {
		return '9 / 16';
	}
	return '4 / 3';
}

/**
 * @param {Record<string, unknown>|null|undefined} groupedSettings Grouped v2 settings.
 * @return {{
 *   type: string,
 *   capabilities: {
 *     filters: boolean,
 *     pagination: boolean,
 *     lightbox: boolean,
 *     hover: boolean,
 *     loadingEffects: boolean,
 *     imageGuardian: boolean,
 *     imageFocus: boolean,
 *     captionsBelow: boolean,
 *     compactCaptionPopover: boolean,
 *   },
 *   derived: {
 *     tileAspectCss: string,
 *     fitGridAlign: string,
 *     polaroidShadowSize: number,
 *     polaroidShadowColor: string,
 *   },
 *   clampWidth: (raw: unknown) => unknown,
 * }} Layout policy for the gallery editor.
 */
export function getLayoutPolicy(groupedSettings) {
	const grouped =
		groupedSettings && typeof groupedSettings === 'object'
			? groupedSettings
			: {};
	const type = resolveGalleryType(grouped);
	const layout =
		grouped.layout && typeof grouped.layout === 'object'
			? grouped.layout
			: {};

	return {
		type,
		capabilities: {
			filters: !isGalleryTypeWithoutFilters(type),
			pagination: !isGalleryTypeWithoutPagination(type),
			lightbox: !isGalleryTypeWithoutLightbox(type),
			hover: !isGalleryTypeWithoutHoverEffects(type),
			loadingEffects: !isGalleryTypeWithoutLoadingEffects(type),
			imageGuardian: !isGalleryTypeWithoutImageGuardian(type),
			imageFocus: isImageFocusSupportedForGalleryType(type),
			captionsBelow: galleryTypeSupportsBelowImageCaptions(type),
			compactCaptionPopover:
				galleryTypeSupportsCompactCaptionPopover(type),
		},
		derived: {
			tileAspectCss: resolveTileAspectCss(type, grouped),
			fitGridAlign: normalizeFitGridImageAlign(layout.fitGridImageAlign),
			polaroidShadowSize: POLAROID_DEFAULT_SHADOW_SIZE,
			polaroidShadowColor: POLAROID_DEFAULT_SHADOW_COLOR,
		},
		clampWidth(raw) {
			return clampMasonryGalleryWidth(raw, type);
		},
	};
}
