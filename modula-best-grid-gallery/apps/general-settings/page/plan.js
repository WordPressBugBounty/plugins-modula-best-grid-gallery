import { __ } from '@wordpress/i18n';

/**
 * Plan badge text from a card's plan slug (`trio` → `Trio`).
 *
 * @param {string|null} plan Plan slug; null when the card names none.
 * @return {string} Label.
 */
export function planLabel(plan) {
	if (null === plan || '' === plan) {
		return __('Pro', 'modula-best-grid-gallery');
	}

	return plan.charAt(0).toUpperCase() + plan.slice(1);
}

/**
 * Pricing page for a locked settings card, tagged with the card.
 *
 * @param {string} cardId
 * @return {string} URL.
 */
export function upgradeUrl(cardId) {
	const url = new URL('https://wp-modula.com/pricing/');
	url.searchParams.set('utm_source', 'upsell');
	url.searchParams.set('utm_medium', 'modula-settings');
	url.searchParams.set('utm_campaign', cardId);
	url.searchParams.set('utm_content', 'v3');

	return url.toString();
}
