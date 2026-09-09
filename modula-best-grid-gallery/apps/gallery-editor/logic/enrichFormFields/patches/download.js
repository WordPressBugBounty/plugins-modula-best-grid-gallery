import { getModulaSettingsEditorConfig } from '../../../config/modulaSettingsEditorConfig';

/**
 * Download image size: options from localized catalogs (same pattern as slider).
 *
 * @param {Object} field Field being enriched.
 */
export function patchDownloadFields(field) {
	const path = field.groupedPath || '';
	if (path === 'download.downloadImageSizes') {
		const allowsCustom = Boolean(field.control?.allowsCustomImageSize);
		const editor = getModulaSettingsEditorConfig();
		const cfg = allowsCustom
			? (editor.sliderImageSizes ?? editor.gridImageSizes)
			: editor.gridImageSizes;
		if (cfg && typeof cfg === 'object' && !Array.isArray(cfg)) {
			const options = Object.keys(cfg);
			return {
				...field,
				control: {
					...field.control,
					kind: 'select',
					options,
					optionLabels: { ...cfg },
					allowsCustomImageSize: allowsCustom,
				},
			};
		}
	}
	return field;
}
