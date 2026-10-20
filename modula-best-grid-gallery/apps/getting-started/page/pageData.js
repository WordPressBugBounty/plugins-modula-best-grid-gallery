/**
 * @typedef {Object} GettingStartedLinks
 * @property {string} documentation The knowledge base.
 * @property {string} settings      Modula Settings.
 * @property {string} galleries     The gallery list.
 * @property {string} extensions    Modula › Extensions.
 * @property {string} facebookGroup The Modula Facebook group.
 * @property {string} supportForum  The wordpress.org support forum.
 * @property {string} aboutUs       The WPChill about page.
 */

/**
 * @typedef {Object} UseCase
 * @property {string} question Plain text.
 * @property {string} answer   HTML, sanitized by the server (`wp_kses_post`).
 */

/**
 * The page data the server prints as `window.modulaGettingStarted`: where the
 * cards lead, and the common use cases from the readme FAQ.
 *
 * @return {{ view: string, links: Partial<GettingStartedLinks>, useCases: UseCase[] }}
 * Data; empty when none was printed. `view` is the server's choice of view
 * ('general', 'about' or 'partners'), 'general' when none was printed.
 */
export function gettingStartedData() {
	const data = window.modulaGettingStarted ?? {};

	return {
		view: data.view ?? 'general',
		links: data.links ?? {},
		useCases: Array.isArray(data.useCases) ? data.useCases : [],
	};
}

/**
 * The header bell's avatar (the WPChill bear), which the server prints only
 * when the WPChill notification center is loaded. The bell shows only for a
 * non-empty string.
 *
 * @return {string|null} Image address as printed, or null when none was.
 */
export function notificationsIcon() {
	return window.modulaGettingStartedNotifications?.iconUrl ?? null;
}
