/**
 * Grouped field write: coerce, set, and field couplings in one place.
 *
 * @package
 */

import { applyCaptionsPlacementSideEffects } from './captionsBelowImageDefaults';
import { coerceSettingsFieldValue } from './coerceSettingsFieldValue';
import { applyLoadingEffectsEnableSideEffects } from './loadingEffectsEnableSideEffects';
import { applyProofingSelectionSideEffects } from './proofingSelectionCoupling';
import { applySocialEnableSideEffects } from './socialEnableSideEffects';

/**
 * Local copy so ticket-02 can make settingsFieldDefault call this module
 * without a circular import.
 *
 * @param {Object|null|undefined} schema
 * @return {*}
 */
function schemaDefault(schema) {
	if (!schema || typeof schema !== 'object') {
		return undefined;
	}
	if (!Object.prototype.hasOwnProperty.call(schema, 'default')) {
		return undefined;
	}
	return schema.default;
}

/**
 * @param {import('@tanstack/react-form').FormApi} form
 * @param {string}                                 groupedPath
 * @param {unknown}                                value
 */
function applyFieldCouplings(form, groupedPath, value) {
	applyCaptionsPlacementSideEffects(form, groupedPath, value);
	applyProofingSelectionSideEffects(form, groupedPath, value);
	applyLoadingEffectsEnableSideEffects(form, groupedPath, value);
	applySocialEnableSideEffects(form, groupedPath, value);
}

/**
 * Coerce a grouped settings value, write it, then run field couplings.
 *
 * @param {import('@tanstack/react-form').FormApi} form
 * @param {{
 *   fieldName: string,
 *   groupedPath: string,
 *   value: unknown,
 * }} opts
 */
export function applyGroupedFieldWrite(form, opts) {
	if (!form || typeof form.setFieldValue !== 'function' || !opts) {
		return;
	}
	const { fieldName, groupedPath, value } = opts;
	if (typeof fieldName !== 'string' || fieldName.trim() === '') {
		return;
	}
	const path =
		typeof groupedPath === 'string' && groupedPath.trim() !== ''
			? groupedPath
			: fieldName;
	const next = coerceSettingsFieldValue(form, path, value);
	form.setFieldValue(fieldName, next);
	applyFieldCouplings(form, path, next);
}

/**
 * Restore a field to its schema default, then run the same couplings.
 *
 * @param {import('@tanstack/react-form').FormApi} form
 * @param {string}                                 fieldName
 * @param {Object|null|undefined}                  schema
 * @param {string}                                 [groupedPath]
 */
export function resetGroupedFieldWrite(form, fieldName, schema, groupedPath) {
	if (!form || typeof form.setFieldValue !== 'function') {
		return;
	}
	if (typeof fieldName !== 'string' || fieldName.trim() === '') {
		return;
	}
	let next = schemaDefault(schema);
	if (next === undefined) {
		const type = schema?.type;
		if (type === 'boolean') {
			next = false;
		} else if (type === 'integer' || type === 'number') {
			next = 0;
		} else {
			next = '';
		}
	}
	form.setFieldValue(fieldName, next);
	if (typeof groupedPath !== 'string' || groupedPath.trim() === '') {
		return;
	}
	applyFieldCouplings(form, groupedPath, next);
}
