import { getEnrichedFieldsForGroup } from '../data/formSchema';
import { isFieldVisible } from './fieldVisibility';
import { validateFieldValue } from './validateFieldValue';

/**
 * Validate only keys present in PATCH body (client hint; server sanitizes).
 *
 * @param {Record<string, Record<string, unknown>>} patch   PATCH body.
 * @param {Record<string, Record<string, unknown>>} grouped Full editor state (for visibility rules).
 * @return {string[]} Human-readable issues.
 */
export function collectPatchValidationErrors(patch, grouped) {
	const errors = [];
	if (!patch || typeof patch !== 'object') {
		return errors;
	}
	for (const group of Object.keys(patch)) {
		const fields = getEnrichedFieldsForGroup(group) || [];
		const byKey = new Map(fields.map((f) => [f.groupedKey, f]));
		const groupPatch = patch[group];
		if (!groupPatch || typeof groupPatch !== 'object') {
			continue;
		}
		for (const key of Object.keys(groupPatch)) {
			const field = byKey.get(key);
			if (!field) {
				continue;
			}
			if (!isFieldVisible(field, grouped)) {
				continue;
			}
			const res = validateFieldValue(field, groupPatch[key]);
			if (!res.valid && res.message) {
				errors.push(`${field.groupedPath}: ${res.message}`);
			}
		}
	}
	return errors;
}
