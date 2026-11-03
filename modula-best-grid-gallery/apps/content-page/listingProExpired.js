/**
 * PRO expired on the content page: with Compatible Pro installed and its
 * license expired or in renewal grace, galleries of a Pro-only gallery type
 * get the PRO expired badge, and the license expired banner counts them.
 * The license state is the gallery editor's (`licenseState`); the Pro-only
 * types come from Pro (`proOnlyGalleryTypes`).
 */

const LAPSED_LICENSE_STATES = ['expired', 'renewal_grace'];

/**
 * Product type keys (`gallery:<type>`, as the listing rows and the Type
 * filter carry them) of the galleries that show PRO expired.
 *
 * @param {{ isPro: boolean, licenseState: string, proOnlyGalleryTypes: string[] }} config
 * @return {string[]} Empty without Pro, with a license that has not lapsed, or without Pro-only types.
 */
export function getProExpiredTypeKeys(config) {
	if (!config.isPro || !LAPSED_LICENSE_STATES.includes(config.licenseState)) {
		return [];
	}
	return config.proOnlyGalleryTypes.map((type) => `gallery:${type}`);
}

/**
 * A trashed gallery is left out, as from the banner's count, which covers
 * every non-trash status.
 *
 * @param {import('./listingRowToFields').ListingRow} row
 * @param {string[]}                                  typeKeys From getProExpiredTypeKeys().
 * @return {boolean}
 */
export function isProExpiredRow(row, typeKeys) {
	return (
		row.type === 'gallery' &&
		row.status !== 'trash' &&
		typeKeys.includes(row.productType)
	);
}

/**
 * The `/listing` query whose total is the banner's count: every non-trash
 * gallery of those types the user can list, on any page, whatever the
 * current section, search or filters.
 *
 * @param {string[]} typeKeys From getProExpiredTypeKeys(); not empty.
 * @return {Record<string, string|number>}
 */
export function proExpiredCountQuery(typeKeys) {
	return {
		section: 'galleries',
		status: 'all',
		productType: typeKeys.join(','),
		per_page: 1,
	};
}
