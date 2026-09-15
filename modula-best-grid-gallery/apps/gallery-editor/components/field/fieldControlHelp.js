/**
 * Field help presentation for settings controls.
 *
 * Under-control help (`getFieldControlHelp`) stays empty so supplementary
 * `editorDescription` can live in the accessible info tip instead.
 * Validation, warnings and intentional inline callouts are unchanged.
 */

/**
 * @param {unknown} value
 * @return {string}
 */
function trimHelpString(value) {
	return typeof value === 'string' ? value.trim() : '';
}

/**
 * @param {string} value
 * @return {string}
 */
function normalizeHelpCopy(value) {
	return value
		.trim()
		.replace(/\.+$/, '')
		.replace(/\s+/g, ' ')
		.toLowerCase();
}

/**
 * Tip text for the field ⓘ control: tooltip and/or description, without
 * duplicating identical copy.
 *
 * @param {Object|null|undefined} field Form schema field
 * @return {string}
 */
export function resolveFieldHelpTipText(field) {
	const tooltip = trimHelpString(field?.editorTooltip);
	const description = trimHelpString(field?.editorDescription);

	if (!tooltip) {
		return description;
	}
	if (!description) {
		return tooltip;
	}
	if (normalizeHelpCopy(tooltip) === normalizeHelpCopy(description)) {
		return tooltip;
	}
	return `${tooltip} ${description}`;
}

/**
 * @param {Object} field Form schema field
 * @return {string|undefined} Help under the control (kept empty for compact panel).
 */
export function getFieldControlHelp(field) {
	if (field?.editorUi?.suppressFieldControlHelp === true) {
		return undefined;
	}
	// Supplementary editorDescription is shown via FieldHelpInfoTip.
	return undefined;
}
