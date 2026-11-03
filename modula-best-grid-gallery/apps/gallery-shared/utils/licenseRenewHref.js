/**
 * Renew PRO on the license expired banner. The gallery editor and the Content
 * page send the same link.
 */
import { appendQuery, withV3Utm } from './withV3Utm';

const PRICING_URL = 'https://wp-modula.com/pricing/';

/**
 * @param {unknown} upgradeUrl The bootstrap's `upgradeUrl`; empty falls back to the pricing page.
 * @return {string} Where the expired license banner's Renew PRO goes.
 */
export function licenseRenewHref(upgradeUrl) {
	const base =
		(typeof upgradeUrl === 'string' && upgradeUrl.trim()) || PRICING_URL;
	return withV3Utm(
		appendQuery(
			base,
			'utm_source=modula-pro&utm_medium=gallery-editor-expired-banner&utm_campaign=renew'
		)
	);
}
