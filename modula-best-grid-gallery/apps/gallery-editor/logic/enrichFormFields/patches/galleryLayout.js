import { getModulaSettingsEditorConfig } from '../../../config/modulaSettingsEditorConfig';

/**
 * Layout: image size options come from PHP-localized `modulaSettingsEditor.gridImageSizes`.
 *
 * @param {Object} field Field being enriched.
 */
export function patchGalleryAndLayoutFields(field) {
	const { groupedPath } = field;
	if (groupedPath === 'layout.gridImageSize') {
		const cfg = getModulaSettingsEditorConfig().gridImageSizes;
		if (cfg && typeof cfg === 'object' && !Array.isArray(cfg)) {
			const options = Object.keys(cfg);
			return {
				...field,
				control: {
					kind: 'select',
					options,
					optionLabels: { ...cfg },
				},
			};
		}
	}
	return field;
}
