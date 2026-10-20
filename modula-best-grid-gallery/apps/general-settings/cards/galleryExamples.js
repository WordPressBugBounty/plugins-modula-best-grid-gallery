// Example addresses shown under the Galleries section's fields: the site's
// own address with sample names (the design's `wedding-day`, `galleries`).

const DEFAULT_LINK_PARAMETER = 'gallery_id';

/**
 * The site address to show: the home URL without scheme or trailing slash.
 *
 * @param {string} homeUrl Site home URL (`home_url( '/' )`).
 * @return {string} Address, e.g. `example.com` or `localhost:10003/blog`.
 */
export function siteAddress(homeUrl) {
	return homeUrl.replace(/^[a-z]+:\/\//i, '').replace(/\/+$/, '');
}

/**
 * Standalone page address for a slug, or for the default slug while the
 * field is empty.
 *
 * @param {string}           site         Site address from siteAddress().
 * @param {string|undefined} slug         Typed slug.
 * @param {string}           fallbackSlug Default slug.
 * @param {string}           sampleName   Sample post name.
 * @return {string} Example address.
 */
export function exampleAddress(site, slug, fallbackSlug, sampleName) {
	const shown = (slug || '').trim() || fallbackSlug;

	return `${site}/${shown}/${sampleName}/`;
}

/**
 * Link to one gallery on the page with all galleries.
 *
 * @param {string}           site      Site address from siteAddress().
 * @param {string|undefined} parameter Typed link parameter.
 * @return {string} Example link.
 */
export function exampleGalleryLink(site, parameter) {
	const shown = (parameter || '').trim() || DEFAULT_LINK_PARAMETER;

	return `${site}/galleries/?${shown}=89`;
}
