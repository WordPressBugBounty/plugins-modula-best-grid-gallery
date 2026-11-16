/**
 * Grouped settings, `{ group: { key: value } }`, as a list of fields: the one
 * flattening the settings form, the saved baseline, the recovery copy and
 * the settings a Pro flow applies share.
 *
 * @package
 */

/**
 * @typedef {Object} GroupedSettingsField
 * @property {string}  group Settings group.
 * @property {string}  key   Field key within the group.
 * @property {unknown} value The field's value.
 * @property {string}  name  Form field name, `group.key`.
 */

/**
 * @param {unknown} value
 * @return {boolean} Whether the value is a plain object (a settings group), not an array.
 */
export function isSettingsGroup(value) {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * @param {unknown} grouped Grouped settings.
 * @return {GroupedSettingsField[]} Each field of each group, in order; a group that is not a plain object has none.
 */
export function groupedSettingsFields(grouped) {
	if (!isSettingsGroup(grouped)) {
		return [];
	}
	return Object.entries(grouped).flatMap(([group, fields]) =>
		isSettingsGroup(fields)
			? Object.entries(fields).map(([key, value]) => ({
					group,
					key,
					value,
					name: `${group}.${key}`,
				}))
			: []
	);
}

/**
 * A copy of a field's value that shares nothing with the source (settings
 * values are JSON).
 *
 * @param {unknown} value
 * @return {unknown} The copy; `undefined` stays `undefined`.
 */
export function cloneSettingValue(value) {
	return value === undefined ? value : JSON.parse(JSON.stringify(value));
}

/**
 * @param {unknown} grouped Grouped settings.
 * @param {string}  group
 * @param {string}  key
 * @return {boolean} Whether the settings have that field (as an own key).
 */
export function hasSettingsField(grouped, group, key) {
	return (
		isSettingsGroup(grouped) &&
		isSettingsGroup(grouped[group]) &&
		Object.hasOwn(grouped[group], key)
	);
}
