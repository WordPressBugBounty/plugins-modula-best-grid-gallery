import { getModulaSettingsEditorConfig } from '../../../config/modulaSettingsEditorConfig';

/**
 * Slider / nav image sizes: options from localized WP size catalogs (may include Custom when Pro allows).
 *
 * @param {Object} field Field being enriched.
 */
export function patchSliderImageFields(field) {
	const groupedPath = field.groupedPath || '';
	if (groupedPath === 'slider.imageSize') {
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
	if (groupedPath === 'slider.syncingNavSize') {
		const cfg = getModulaSettingsEditorConfig().sliderSyncingNavSizes;
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
