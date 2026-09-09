/**
 * Keep social.enableSocial in sync with network toggles (OR of providers).
 *
 * @package
 */

import { isWpTruthy } from './wpTruthy';

export const SOCIAL_NETWORK_GROUPED_KEYS = [
	'enableTwitter',
	'enableFacebook',
	'enableWhatsapp',
	'enableLinkedin',
	'enablePinterest',
	'enableEmail',
];

export const SOCIAL_NETWORK_GROUPED_PATHS = SOCIAL_NETWORK_GROUPED_KEYS.map(
	(key) => `social.${key}`
);

/**
 * @param {Record<string, unknown>|undefined|null} social
 * @return {boolean}
 */
export function anySocialNetworkEnabled(social) {
	if (!social || typeof social !== 'object') {
		return false;
	}
	return SOCIAL_NETWORK_GROUPED_KEYS.some((key) => isWpTruthy(social[key]));
}

/**
 * Force enableSocial from the OR of network flags (legacy inconsistency fix).
 *
 * @param {Record<string, unknown>|undefined|null} social
 */
export function normalizeSocialEnableFromNetworks(social) {
	if (!social || typeof social !== 'object') {
		return;
	}
	social.enableSocial = anySocialNetworkEnabled(social);
}

/**
 * When a network toggle changes, sync enableSocial.
 *
 * @param {import('@tanstack/react-form').FormApi} form
 * @param {string}                                 groupedPath
 * @param {unknown}                                [value] Current value just written for groupedPath.
 */
export function applySocialEnableSideEffects(form, groupedPath, value) {
	if (!SOCIAL_NETWORK_GROUPED_PATHS.includes(groupedPath)) {
		return;
	}
	const socialRaw = form.getFieldValue('social');
	const social =
		socialRaw && typeof socialRaw === 'object' ? { ...socialRaw } : {};
	const key = groupedPath.slice('social.'.length);
	if (key) {
		social[key] = value;
	}
	form.setFieldValue('social.enableSocial', anySocialNetworkEnabled(social));
}
