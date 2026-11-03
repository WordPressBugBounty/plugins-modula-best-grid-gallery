/**
 * Speed Up compression runs only where the Settings page allows it
 * (`Modula_Settings::compression_available()`: production, or the
 * `modula_speedup_run_local_compression` filter). PHP sends that state as
 * `compressionAvailable`; fields with `editorRequiresCompression` follow it.
 */

/**
 * @param {Record<string, unknown>} editor Localized editor bootstrap.
 * @return {boolean} Whether compression can run on this site.
 */
export function isCompressionAvailable(editor) {
	// wp_localize_script sends booleans as '1' / ''.
	return Boolean(editor?.compressionAvailable);
}

/**
 * @param {Object|null|undefined}   schemaObj Field schema from the form export.
 * @param {Record<string, unknown>} editor    Localized editor bootstrap.
 * @return {boolean} Whether the field is a compression setting this site cannot run.
 */
export function isCompressionFieldUnavailable(schemaObj, editor) {
	return (
		schemaObj?.editorRequiresCompression === true &&
		!isCompressionAvailable(editor)
	);
}
