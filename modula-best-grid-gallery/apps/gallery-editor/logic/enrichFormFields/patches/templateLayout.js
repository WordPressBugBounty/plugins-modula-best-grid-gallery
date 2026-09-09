/**
 * Pro gates + MenuSelect for template layout presets.
 */
import { buildOptionGatesFromProEnhancements } from './generalGalleryType';

/**
 * @param {object} field
 * @return {object}
 */
export function patchTemplateLayoutField(field) {
	if (field.groupedPath !== 'template.templateLayout') {
		return field;
	}

	const pe =
		field.schema && typeof field.schema === 'object'
			? field.schema.proEnhancements
			: null;
	const optionGates = buildOptionGatesFromProEnhancements(pe);

	return {
		...field,
		control: {
			...field.control,
			kind: 'templateLayoutSelect',
			...(optionGates ? { optionGates } : {}),
		},
	};
}
