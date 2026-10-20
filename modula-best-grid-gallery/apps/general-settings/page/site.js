import { siteAddress } from '../cards/galleryExamples';

/**
 * The site's address for example links, from the home URL the settings page
 * prints (`window.modulaSettingsSite`). Falls back to the admin's own host,
 * which is the same site unless home and admin live on different hosts.
 *
 * @return {string} Site address.
 */
export function currentSiteAddress() {
	const homeUrl = window.modulaSettingsSite?.homeUrl;

	return siteAddress(
		'string' === typeof homeUrl ? homeUrl : window.location.origin
	);
}
