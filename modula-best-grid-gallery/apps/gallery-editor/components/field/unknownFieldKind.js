/**
 * A settings field whose `control.kind` has no renderer (a typo in PHP, or a
 * Pro build newer than Lite). Development builds show the error in place of
 * the control, so it is caught while working; production keeps today's plain
 * text field, so an older Lite still lets the setting be edited.
 */

/**
 * @param {string} [nodeEnv] Build mode; webpack inlines `process.env.NODE_ENV`.
 * @return {'error'|'fallback'} What the field shows.
 */
export function unknownFieldKindPresentation(nodeEnv = process.env.NODE_ENV) {
	return nodeEnv === 'production' ? 'fallback' : 'error';
}

/**
 * Developer message; not translated, like the console errors it repeats.
 *
 * @param {string} kind
 * @param {string} groupedPath
 * @return {string} Message naming the kind and the setting.
 */
export function describeUnknownFieldKind(kind, groupedPath) {
	return `Unknown field kind "${kind}" for setting "${groupedPath}".`;
}
