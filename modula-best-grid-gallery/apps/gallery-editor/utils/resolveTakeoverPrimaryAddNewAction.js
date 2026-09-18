/**
 * Primary Add images click for takeover preview chrome.
 * Bound galleries stay on content block; video galleries use the video library picker.
 */

import { boundGalleryPrimaryAddNewAction } from './boundGalleryChromePolicy';

/**
 * @param {{
 *   boundSummary?: import('./boundGalleryChromePolicy').BoundGallerySummary|null,
 *   galleryType?: string,
 * }} [args]
 * @return {'content-block'|'video-library'|'library'}
 */
export function resolveTakeoverPrimaryAddNewAction({
	boundSummary = null,
	galleryType = '',
} = {}) {
	if (boundGalleryPrimaryAddNewAction(boundSummary) === 'content-block') {
		return 'content-block';
	}
	if (galleryType === 'video') {
		return 'video-library';
	}
	return 'library';
}
