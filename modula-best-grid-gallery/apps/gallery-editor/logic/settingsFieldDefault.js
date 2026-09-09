/**
 * Compare / restore settings field values against schema.default.
 */
import { isNil } from './isNil';
import { isWpTruthy } from './wpTruthy';
import { resetGroupedFieldWrite } from './groupedFieldWrite';

/**
 * @param {Object|null|undefined} schema
 * @return {*}
 */
export function schemaDefault(schema) {
	if (!schema || typeof schema !== 'object') {
		return undefined;
	}
	if (!Object.prototype.hasOwnProperty.call(schema, 'default')) {
		return undefined;
	}
	return schema.default;
}

/**
 * @param {*} value
 * @return {boolean}
 */
function isEmptyValue(value) {
	return isNil(value) || value === '';
}

/**
 * @param {*} effective
 * @param {*} fallback
 * @param {Object|null|undefined} schema
 * @return {boolean}
 */
function valuesMatchDefault(effective, fallback, schema) {
	const type = schema?.type;
	if (type === 'boolean') {
		return isWpTruthy(effective) === isWpTruthy(fallback);
	}
	if (typeof effective === 'boolean' || typeof fallback === 'boolean') {
		return isWpTruthy(effective) === isWpTruthy(fallback);
	}
	if (typeof effective === 'number' || typeof fallback === 'number') {
		const a = Number(effective);
		const b = Number(fallback);
		if (Number.isFinite(a) && Number.isFinite(b)) {
			return a === b;
		}
	}
	if (
		Array.isArray(effective) ||
		Array.isArray(fallback) ||
		(effective &&
			fallback &&
			typeof effective === 'object' &&
			typeof fallback === 'object')
	) {
		return JSON.stringify(effective) === JSON.stringify(fallback);
	}
	return String(effective ?? '').trim() === String(fallback ?? '').trim();
}

/**
 * Missing / empty stored values count as default (same as display fallbacks).
 *
 * @param {*} value
 * @param {Object|null|undefined} schema
 * @return {boolean}
 */
export function isSettingsValueAtDefault(value, schema) {
	const fallback = schemaDefault(schema);
	if (fallback === undefined) {
		return true;
	}
	const effective = isEmptyValue(value) ? fallback : value;
	return valuesMatchDefault(effective, fallback, schema);
}

/**
 * @param {Object|null|undefined} field
 * @return {boolean}
 */
export function isPresentationOnlyField(field) {
	const kind = field?.control?.kind;
	return (
		kind === 'heading' ||
		kind === 'infoCallout' ||
		field?.editorHideRowLabel === true
	);
}

/**
 * @param {import('@tanstack/react-form').FormApi} form
 * @param {string} fieldName
 * @param {Object|null|undefined} schema
 * @param {string} [groupedPath]
 */
export function resetSettingsFieldValue(
	form,
	fieldName,
	schema,
	groupedPath
) {
	resetGroupedFieldWrite(form, fieldName, schema, groupedPath);
}
