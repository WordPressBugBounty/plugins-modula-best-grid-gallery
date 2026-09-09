/**
 * @param {Object} field Form schema field
 * @return {string|undefined} Help under the control from `editorDescription`.
 */
export function getFieldControlHelp(field) {
	if (field.editorUi?.suppressFieldControlHelp === true) {
		return undefined;
	}
	if (
		typeof field.editorDescription === 'string' &&
		field.editorDescription.trim() !== ''
	) {
		return field.editorDescription;
	}
	return undefined;
}
