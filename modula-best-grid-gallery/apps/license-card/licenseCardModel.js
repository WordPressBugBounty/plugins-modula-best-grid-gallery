import { __, sprintf } from '@wordpress/i18n';

/**
 * @typedef {'active' | 'renewal_grace' | 'expired' | 'none'} LicenseState
 */

/**
 * @typedef {Object} LicenseSites
 * @property {number}      used  Sites the license is active on.
 * @property {number|null} limit Null for unlimited sites.
 */

/**
 * The Modula Pro license as the license route projects it (ADR 0049). The
 * route never sends the full key, only its last four characters.
 *
 * @typedef {Object} License
 * @property {LicenseState} state              Licensing state in Pro.
 * @property {string}       product            Plan name, e.g. "Agency license".
 * @property {boolean}      lifetime           Whether it never expires.
 * @property {number|null}  expires            Unix timestamp; null for a lifetime license or no date.
 * @property {number|null}  renewal_grace_ends Unix timestamp, only in renewal grace.
 * @property {string}       key_last_four      '' without a license.
 * @property {LicenseSites} sites              Sites used and allowed.
 */

/** The states the license route sends (Pro's licensing states). */
const LICENSE_STATES = ['active', 'renewal_grace', 'expired', 'none'];

/** Where customers manage their sites and find their keys. */
export const MY_ACCOUNT_URL = 'https://wp-modula.com/my-account/';

/** Where a license is bought. */
export const PRICING_URL = 'https://wp-modula.com/pricing/';

/**
 * @typedef {'renew' | 'change' | 'deactivate'} SummaryAction
 */

/**
 * The badge's tone; the card styles it as `is-<tone>`.
 *
 * @typedef {'active' | 'inactive' | 'warning' | 'danger'} BadgeTone
 */

/**
 * The status badge of each state. Both expired states read Expired: in
 * renewal grace as a warning (the extensions still work), after it as an
 * alarm (every extension is locked).
 *
 * @return {Record<LicenseState, {label: string, tone: BadgeTone}>} Badges.
 */
function statusBadges() {
	const expired = __('Expired', 'modula-best-grid-gallery');

	return {
		active: {
			label: __('Active', 'modula-best-grid-gallery'),
			tone: 'active',
		},
		renewal_grace: { label: expired, tone: 'warning' },
		expired: { label: expired, tone: 'danger' },
		none: {
			label: __('Not active', 'modula-best-grid-gallery'),
			tone: 'inactive',
		},
	};
}

/**
 * For each key action: the route's error codes whose message the card shows
 * as is, and the message for any other failure (network, server error).
 *
 * @return {Record<string, {codes: string[], fallback: string}>} By action.
 */
function actionFailures() {
	return {
		activate: {
			codes: [
				'modula_license_key_missing',
				'modula_license_not_activated',
			],
			fallback: __(
				'The key could not be activated. Try again in a few minutes.',
				'modula-best-grid-gallery'
			),
		},
		deactivate: {
			codes: ['modula_license_not_deactivated'],
			fallback: __(
				'The license could not be deactivated. Try again in a few minutes.',
				'modula-best-grid-gallery'
			),
		},
	};
}

/**
 * @param {*} value
 * @return {boolean} Whether it is a whole number of zero or more.
 */
function isCount(value) {
	return Number.isInteger(value) && value >= 0;
}

/**
 * @param {*} value
 * @return {boolean} Whether it is a timestamp or null.
 */
function isOptionalTimestamp(value) {
	return null === value || isCount(value);
}

/**
 * Whether the license route's answer has the shape the card reads.
 *
 * @param {*} value
 * @return {boolean} Whether it is a `License`.
 */
export function isLicense(value) {
	if (null === value || 'object' !== typeof value) {
		return false;
	}
	const { sites } = value;

	return (
		LICENSE_STATES.includes(value.state) &&
		'string' === typeof value.product &&
		'boolean' === typeof value.lifetime &&
		isOptionalTimestamp(value.expires) &&
		isOptionalTimestamp(value.renewal_grace_ends) &&
		'string' === typeof value.key_last_four &&
		null !== sites &&
		'object' === typeof sites &&
		isCount(sites.used) &&
		(null === sites.limit || isCount(sites.limit))
	);
}

/**
 * Which face the card shows: the license, the key form to change it, or the
 * key form of a site without a license.
 *
 * @param {License} license
 * @param {boolean} isChangingKey The admin chose Change key.
 * @return {'summary' | 'change' | 'enter'} View.
 */
export function cardView(license, isChangingKey) {
	if ('none' === license.state) {
		return 'enter';
	}

	return isChangingKey ? 'change' : 'summary';
}

/**
 * @param {LicenseState} state
 * @return {{label: string, tone: BadgeTone}} The status badge.
 */
export function statusBadge(state) {
	const badges = statusBadges();
	if (!Object.hasOwn(badges, state)) {
		throw new Error(`Unknown license state: ${state}`);
	}

	return badges[state];
}

/**
 * The license's term: "Lifetime", "Renews <date>", in renewal grace
 * "Extensions stay on until <date>", or for an expired license
 * "Expired <date>".
 *
 * @param {License}  license
 * @param {Function} formatDate Formats a unix timestamp as a date.
 * @return {string} Term, '' without a date.
 */
export function termText(license, formatDate) {
	if (license.lifetime) {
		return __('Lifetime', 'modula-best-grid-gallery');
	}
	if (
		'renewal_grace' === license.state &&
		null !== license.renewal_grace_ends
	) {
		return sprintf(
			/* translators: %s: date the renewal grace ends */
			__('Extensions stay on until %s', 'modula-best-grid-gallery'),
			formatDate(license.renewal_grace_ends)
		);
	}
	if (null === license.expires) {
		return '';
	}
	const date = formatDate(license.expires);

	if ('active' === license.state) {
		/* translators: %s: renewal date */
		return sprintf(__('Renews %s', 'modula-best-grid-gallery'), date);
	}

	/* translators: %s: expiry date */
	return sprintf(__('Expired %s', 'modula-best-grid-gallery'), date);
}

/**
 * The license summary's actions, in order. An expired license offers Renew
 * first. Past renewal grace Deactivate goes (decision 13): no extension is
 * left to turn off, and the site's activation is freed in My Account or by
 * Change key.
 *
 * @param {LicenseState} state A state with a license.
 * @return {SummaryAction[]} Actions.
 */
export function summaryActions(state) {
	const actions = {
		active: ['change', 'deactivate'],
		renewal_grace: ['renew', 'change', 'deactivate'],
		expired: ['renew', 'change'],
	};
	if (!Object.hasOwn(actions, state)) {
		throw new Error(`No license summary for state: ${state}`);
	}

	return actions[state];
}

/**
 * @param {LicenseSites} sites
 * @return {string} "1 of 99 used", or "Unlimited sites".
 */
export function sitesText(sites) {
	if (null === sites.limit) {
		return __('Unlimited sites', 'modula-best-grid-gallery');
	}

	return sprintf(
		/* translators: 1: sites the license is used on, 2: sites it allows */
		__('%1$d of %2$d used', 'modula-best-grid-gallery'),
		sites.used,
		sites.limit
	);
}

/**
 * @param {LicenseSites} sites
 * @return {string|null} The meter's fill as a CSS width, null for unlimited sites.
 */
export function sitesMeterWidth(sites) {
	if (null === sites.limit) {
		return null;
	}
	const percent = Math.min(100, Math.round((sites.used / sites.limit) * 100));

	return `${percent}%`;
}

/**
 * @param {string} lastFour The key's last four characters.
 * @return {string} The key as the card shows it, '' without them.
 */
export function maskedKey(lastFour) {
	return '' === lastFour ? '' : `•••• •••• •••• ${lastFour}`;
}

/**
 * The success toast after a key was activated. An expired key is saved too
 * (renewal grace, or expired past it), so the toast says it needs renewing.
 *
 * @param {License} license The license the activation left.
 * @return {string} Message.
 */
export function activatedMessage(license) {
	const expired = __(
		'Key saved. This license has expired: renew it in My Account.',
		'modula-best-grid-gallery'
	);
	const messages = {
		active: __('License activated', 'modula-best-grid-gallery'),
		renewal_grace: expired,
		expired,
	};
	if (!Object.hasOwn(messages, license.state)) {
		throw new Error(`No license after activation: ${license.state}`);
	}

	return messages[license.state];
}

/**
 * What the card says when a key action fails: the route's own message for
 * the failures it explains, else a message of the card's.
 *
 * @param {'activate' | 'deactivate'} action
 * @param {*}                         error  apiFetch's rejection.
 * @return {string} Message.
 */
export function actionFailedMessage(action, error) {
	const failures = actionFailures();
	if (!Object.hasOwn(failures, action)) {
		throw new Error(`Unknown license action: ${action}`);
	}
	const { codes, fallback } = failures[action];
	const isExplained =
		codes.includes(error?.code) &&
		'string' === typeof error.message &&
		'' !== error.message;

	return isExplained ? error.message : fallback;
}
