/**
 * How hub rows write a change (SettingsPanelFieldRow `writeValue`). Each row
 * keeps the write path it had: toggles and positions go through the grouped
 * write (coercion and field couplings); colour, segmented and select rows set
 * the value directly.
 */
import { applyGroupedFieldWrite } from '../../../logic/groupedFieldWrite';

/**
 * @param {*}      next
 * @param {Object} target
 * @param {Object} target.form
 * @param {string} target.fieldName
 * @param {Object} target.field
 */
export function writeGroupedField(next, { form, fieldName, field }) {
	applyGroupedFieldWrite(form, {
		fieldName,
		groupedPath: field.groupedPath,
		value: next,
	});
}

/**
 * @param {*}      next
 * @param {Object} target
 * @param {Object} target.form
 * @param {string} target.fieldName
 */
export function setFieldValueDirectly(next, { form, fieldName }) {
	form.setFieldValue(fieldName, next);
}
