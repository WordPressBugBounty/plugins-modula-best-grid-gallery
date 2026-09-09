/**
 * Coerce / clamp settings field values before writing into the form.
 *
 * @package
 */

import { getLayoutPolicy } from 'gallery-shared/preview';

/**
 * @param {import('@tanstack/react-form').FormApi} form
 * @param {string}                                 groupedPath
 * @param {unknown}                                value
 * @return {unknown} Coerced value, or the original value when no coerce applies.
 */
export function coerceSettingsFieldValue(form, groupedPath, value) {
	if (groupedPath === 'general.width') {
		return getLayoutPolicy({
			general: { type: form?.state?.values?.general?.type },
		}).clampWidth(value);
	}
	return value;
}
