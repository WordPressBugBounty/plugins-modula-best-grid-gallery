import { isNil } from '../../../logic/isNil';

/**
 * What a hub control shows for a setting never saved: the stored value, or
 * the schema default while it is empty (so a default-on toggle does not
 * show off on an older gallery).
 *
 * @param {*}      value
 * @param {Object} field
 * @return {*} Value to show.
 */
export function valueOrSchemaDefault(value, field) {
	if (value !== '' && !isNil(value)) {
		return value;
	}
	if (
		field?.schema &&
		Object.prototype.hasOwnProperty.call(field.schema, 'default') &&
		!isNil(field.schema.default)
	) {
		return field.schema.default;
	}

	return value;
}
