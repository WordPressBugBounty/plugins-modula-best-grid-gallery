/**
 * The saved-state marker a write response carries (`savedState`, added by the
 * server next to `postStatus`): it changes whenever the stored document
 * changes, by any save path. The recovery copy compares it.
 *
 * @param {unknown} response REST response body.
 * @return {string|null|undefined} The marker (null: the document was never saved), or undefined when the response has none.
 */
export function readRestSavedState(response) {
	if (!response || typeof response !== 'object') {
		return undefined;
	}
	const marker = response.savedState;
	return typeof marker === 'string' || marker === null ? marker : undefined;
}

/**
 * Remove the post fragments (status, saved-state marker) from grouped
 * settings PATCH payloads.
 *
 * @param {Record<string, unknown>|null|undefined} payload
 * @return {Record<string, unknown>} The grouped settings alone.
 */
export function stripRestPostMeta(payload) {
	if (!payload || typeof payload !== 'object') {
		return {};
	}
	const {
		postStatus: _postStatus,
		postStatusLabel: _postStatusLabel,
		savedState: _savedState,
		...rest
	} = payload;
	return rest;
}
