import { humanizeKey } from './humanizeKey';

/**
 * Label a schema field row shows: `editorLabel`, else the humanized key.
 *
 * @param {Object} field Form schema field descriptor.
 * @return {string} Row label text ('' when the field has neither).
 */
export function resolveFieldRowLabel(field) {
	if (typeof field?.editorLabel === 'string' && field.editorLabel !== '') {
		return field.editorLabel;
	}
	return humanizeKey(field?.groupedKey);
}
