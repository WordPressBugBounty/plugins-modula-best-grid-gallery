/**
 * Query arg read by Pro's legacy Defaults filters on the classic create screen.
 * Classic New from preset reuses it so the legacy code stays untouched.
 */
const LEGACY_PRESET_QUERY_ARG = 'modula_default';

/** New from preset start for built-in defaults (PHP `PRESET_CHOICE_BLANK`). */
export const BLANK_START = 'blank';

/**
 * @param {unknown} start Candidate New from preset start.
 * @return {boolean} True for a positive integer preset ID.
 */
function isPresetId(start) {
	return Number.isInteger(start) && start > 0;
}

/**
 * Set the New from preset arg for the chosen editor.
 *
 * New editor: `presetQueryArg=<id|blank>`; no arg means "use the Default preset".
 * Classic: legacy `modula_default=<id>`; Blank is the same as the main click.
 *
 * @param {URL}                          url            Create URL.
 * @param {'beta' | 'classic'}           choice         Editor choice.
 * @param {number | 'blank' | undefined} start          Preset ID, 'blank', or none.
 * @param {string}                       presetQueryArg New editor preset arg name.
 * @return {void}
 */
function setPresetStart(url, choice, start, presetQueryArg) {
	if ('beta' === choice) {
		if (isPresetId(start) || BLANK_START === start) {
			url.searchParams.set(presetQueryArg, String(start));
		}
		return;
	}
	if ('classic' === choice && isPresetId(start)) {
		url.searchParams.set(LEGACY_PRESET_QUERY_ARG, String(start));
	}
}

/**
 * Build post-new URL with editor choice (matches modula-beta-gallery-create.js).
 *
 * @param {{
 *   postNewUrl: string,
 *   queryArg?: string,
 *   createNonce?: string,
 *   choice: 'beta' | 'classic',
 *   presetQueryArg?: string,
 *   start?: number | 'blank',
 * }} params
 * @return {string} Create URL, or '' without a post-new URL.
 */
export function buildCreateGalleryUrl({
	postNewUrl,
	queryArg = 'modula_editor',
	createNonce = '',
	choice,
	presetQueryArg = 'modula_preset',
	start,
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
		setPresetStart(url, choice, start, presetQueryArg);
		return url.toString();
	} catch {
		return postNewUrl;
	}
}
