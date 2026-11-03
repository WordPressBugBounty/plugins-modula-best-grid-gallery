/**
 * Help line under a field control. Its id is `controlHelpId(controlId)`, so
 * the control can point `aria-describedby` at it.
 *
 * @param {Object}           props
 * @param {string|undefined} props.help
 * @param {string}           [props.controlId]
 */
export function ControlHelp({ help, controlId }) {
	if (typeof help !== 'string' || help === '') {
		return null;
	}

	return (
		<p
			id={controlId ? controlHelpId(controlId) : undefined}
			className="modula-settings-editor__field-help"
		>
			{help}
		</p>
	);
}

/**
 * @param {string} controlId
 * @return {string} Id of the control's help line.
 */
export function controlHelpId(controlId) {
	return `${controlId}-help`;
}

/**
 * `aria-describedby` for a control whose help line renders under it.
 *
 * @param {string|undefined} controlId
 * @param {string|undefined} help
 * @return {string|undefined} The help id, or undefined without help or id.
 */
export function describedByHelp(controlId, help) {
	if (!controlId || typeof help !== 'string' || help === '') {
		return undefined;
	}

	return controlHelpId(controlId);
}
