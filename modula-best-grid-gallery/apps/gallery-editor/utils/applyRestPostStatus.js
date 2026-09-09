/**
 * Sync takeover top-bar post status when REST write responses include postStatus.
 *
 * @param {unknown} response REST response body.
 * @param {(slug: string, label: string) => void} apply
 */
export function applyRestPostStatus(response, apply) {
	if (!response || typeof apply !== 'function') {
		return;
	}
	const body =
		typeof response === 'object' && response !== null ? response : null;
	if (!body) {
		return;
	}
	const slug = body.postStatus;
	const label = body.postStatusLabel;
	if (typeof slug !== 'string' || !slug) {
		return;
	}
	apply(slug, typeof label === 'string' && label ? label : slug);
}

/**
 * Remove postStatus fragments from grouped settings PATCH payloads.
 *
 * @param {Record<string, unknown>|null|undefined} payload
 * @return {Record<string, unknown>}
 */
export function stripRestPostMeta(payload) {
	if (!payload || typeof payload !== 'object') {
		return {};
	}
	const { postStatus: _postStatus, postStatusLabel: _postStatusLabel, ...rest } =
		payload;
	return rest;
}
