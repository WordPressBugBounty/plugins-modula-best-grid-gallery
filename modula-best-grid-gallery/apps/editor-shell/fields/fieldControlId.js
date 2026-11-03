/**
 * Id of a setting's native control (input, select, switch), so the row's
 * `<label htmlFor>` names it. The wrapper `modula-field-{path}` id stays the
 * scroll and anchor target.
 *
 * @param {string} groupedPath
 * @return {string} Control id.
 */
export function fieldControlId(groupedPath) {
	return `modula-field-control-${String(groupedPath || 'field').replace(
		/[^a-z0-9.-]/gi,
		'-'
	)}`;
}
