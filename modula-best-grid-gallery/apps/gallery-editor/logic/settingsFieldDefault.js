/**
 * Compare / restore settings field values against schema.default.
 */
import {
	resolveEffectiveSettingsValue,
	schemaDefault,
} from './effectiveSettingsValue';
import { resetGroupedFieldWrite } from './groupedFieldWrite';
import { isWpTruthy } from './wpTruthy';

export { schemaDefault } from './effectiveSettingsValue';

/**
 * @param {*}                     effective
 * @param {*}                     fallback
 * @param {Object|null|undefined} schema
 * @return {boolean} True when effective matches the schema default.
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
 * @param {*}                     value
 * @param {Object|null|undefined} schema
 * @return {boolean} True when the stored value is the schema default (empty counts as default).
 */
export function isSettingsValueAtDefault(value, schema) {
	const fallback = schemaDefault(schema);
	if (fallback === undefined) {
		return true;
	}
	const effective = resolveEffectiveSettingsValue(value, schema);
	return valuesMatchDefault(effective, fallback, schema);
}

/**
 * @param {Object|null|undefined} field
 * @return {boolean} True for heading / info / label-hidden rows.
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
 * @param {string}                                 fieldName
 * @param {Object|null|undefined}                  schema
 * @param {string}                                 [groupedPath]
 */
export function resetSettingsFieldValue(form, fieldName, schema, groupedPath) {
	resetGroupedFieldWrite(form, fieldName, schema, groupedPath);
}
