import { EDITOR_UI_BY_PATH } from '../../data/editorFieldUi';
import { patchDownloadFields } from './patches/download';
import { patchGeneralGalleryTypeField } from './patches/generalGalleryType';
import { patchTemplateLayoutField } from './patches/templateLayout';
import { patchGalleryAndLayoutFields } from './patches/galleryLayout';
import { patchSliderImageFields } from './patches/slider';

/**
 * @param {Object} field Raw schema field.
 * @param {number} index Original index within group.
 * @return {Object} Field with `editorUi` and dynamic control patches.
 */
export function enrichField(field, index) {
	const uiPatch = EDITOR_UI_BY_PATH[field.groupedPath || ''] || {};
	let next = {
		...field,
		editorUi: {
			...(field.editorUi || {}),
			...uiPatch,
			_orig: index,
		},
	};
	next = patchGeneralGalleryTypeField(next);
	next = patchTemplateLayoutField(next);
	next = patchGalleryAndLayoutFields(next);
	next = patchSliderImageFields(next);
	next = patchDownloadFields(next);
	return next;
}
