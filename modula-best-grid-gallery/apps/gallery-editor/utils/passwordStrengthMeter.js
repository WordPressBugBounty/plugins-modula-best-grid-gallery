import { __ } from '@wordpress/i18n';

/**
 * WordPress `wp.passwordStrength.meter` score → UI class + label (user-profile parity).
 *
 * @param {string} password
 * @return {{ level: 'empty'|'short'|'bad'|'good'|'strong'|'unknown', label: string }}
 */
export function getPasswordStrengthMeta(password) {
	const pass = typeof password === 'string' ? password.trim() : '';
	if (!pass) {
		return { level: 'empty', label: '' };
	}

	const meter = window.wp?.passwordStrength?.meter;
	if (typeof meter !== 'function') {
		return {
			level: 'unknown',
			label: __('Strength unavailable', 'modula-best-grid-gallery'),
		};
	}

	const blacklist =
		typeof window.wp.passwordStrength.userInputDisallowedList === 'function'
			? window.wp.passwordStrength.userInputDisallowedList()
			: [];

	const score = meter(pass, blacklist, pass);

	switch (score) {
		case -1:
			return {
				level: 'bad',
				label: __('Unknown', 'modula-best-grid-gallery'),
			};
		case 2:
			return {
				level: 'bad',
				label: __('Weak', 'modula-best-grid-gallery'),
			};
		case 3:
			return {
				level: 'good',
				label: __('Medium', 'modula-best-grid-gallery'),
			};
		case 4:
			return {
				level: 'strong',
				label: __('Strong', 'modula-best-grid-gallery'),
			};
		case 5:
			return {
				level: 'short',
				label: __('Mismatch', 'modula-best-grid-gallery'),
			};
		default:
			return {
				level: 'short',
				label: __('Very weak', 'modula-best-grid-gallery'),
			};
	}
}
