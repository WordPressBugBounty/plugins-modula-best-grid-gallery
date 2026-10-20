/**
 * @typedef {Object} Partner
 * @property {string}  name        Plain text.
 * @property {string}  version     Plain text; empty when the list gives none.
 * @property {string}  description Plain text.
 * @property {string}  image       Escaped URL; the default image when the list gives none.
 * @property {string}  url         Escaped URL of the partner's site; empty when the list gives none.
 * @property {boolean} active      Whether the plugin is active on this site.
 */

/**
 * The partner plugins the server prints in `window.modulaGettingStarted` on
 * the Partners view.
 *
 * @return {Partner[]|null} Partners, or null when the list couldn't be
 * loaded (or none was printed).
 */
export function partnersData() {
	const partners = window.modulaGettingStarted?.partners;

	return Array.isArray(partners) && partners.length > 0 ? partners : null;
}
