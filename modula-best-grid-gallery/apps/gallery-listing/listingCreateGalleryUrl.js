/**
 * Build post-new URL with editor choice (matches modula-beta-gallery-create.js).
 *
 * @param {{
 *   postNewUrl: string,
 *   queryArg?: string,
 *   createNonce?: string,
 *   choice: 'beta' | 'classic',
 * }} params
 * @return {string}
 */
export function buildCreateGalleryUrl({
	postNewUrl,
	queryArg = 'modula_editor',
	createNonce = '',
	choice,
}) {
	if (!postNewUrl) {
		return '';
	}

	try {
		const url = postNewUrl.startsWith('http')
			? new URL(postNewUrl)
			: new URL(postNewUrl, window.location.origin);
		url.searchParams.set(queryArg, choice);
		if (createNonce) {
			url.searchParams.set('_wpnonce', createNonce);
		}
		return url.toString();
	} catch {
		return postNewUrl;
	}
}
