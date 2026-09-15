/**
 * Effective grouped settings value: stored when not empty, else schema default.
 *
 * Shared by show/hide (`evaluateWhen`), dirty chrome, and init/reset hydrate.
 *
 * @package
 */

import {
	findFieldByGroupedPath,
	getFormSchemaGroupsById,
} from '../data/formSchema';
import { getByPath, setByPath } from './getByPath';
import { isNil } from './isNil';

/**
 * @param {Object|null|undefined} schema
 * @return {*} Schema `default` when declared; otherwise undefined.
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
 * @return {boolean} True when the stored value is nil or `''`.
 */
function isEmptyValue(value) {
	return isNil(value) || value === '';
}

/**
 * Stored value when it is not nil and not `''`; otherwise the schema default
 * when the schema declares one.
 *
 * @param {*}                     value  Stored grouped value.
 * @param {Object|null|undefined} schema Field schema (`default` when present).
 * @return {*} Effective value for display, dirty chrome, and show/hide.
 */
export function resolveEffectiveSettingsValue(value, schema) {
	if (!isEmptyValue(value)) {
		return value;
	}
	const fallback = schemaDefault(schema);
	return fallback === undefined ? value : fallback;
}

/**
 * Effective value at a grouped path: stored when present, else schema default.
 *
 * @param {Record<string, Record<string, unknown>>} grouped Current grouped settings.
 * @param {string}                                  path    Dotted grouped path.
 * @return {unknown} Stored value, schema default, or undefined when neither exists.
 */
export function getEffectiveGroupedPathValue(grouped, path) {
	const stored = getByPath(grouped, path);
	if (!isEmptyValue(stored)) {
		return stored;
	}
	const hit = findFieldByGroupedPath(path);
	return resolveEffectiveSettingsValue(stored, hit?.field?.schema);
}

/**
 * Write schema defaults into missing/empty grouped paths (init/reset hydrate).
 * Reuses {@link resolveEffectiveSettingsValue}; does not overwrite authored values.
 *
 * @param {Record<string, Record<string, unknown>>} grouped Grouped settings (mutated).
 */
export function hydrateEmptyGroupedPathsFromSchemaDefaults(grouped) {
	if (!grouped || typeof grouped !== 'object') {
		return;
	}
	for (const group of getFormSchemaGroupsById().values()) {
		const fields = group?.fields;
		if (!Array.isArray(fields)) {
			continue;
		}
		for (const field of fields) {
			const path = field?.groupedPath;
			if (typeof path !== 'string' || path.trim() === '') {
				continue;
			}
			const schema = field.schema;
			if (schemaDefault(schema) === undefined) {
				continue;
			}
			const stored = getByPath(grouped, path);
			const effective = resolveEffectiveSettingsValue(stored, schema);
			if (Object.is(effective, stored)) {
				continue;
			}
			setByPath(grouped, path, effective);
		}
	}
}
