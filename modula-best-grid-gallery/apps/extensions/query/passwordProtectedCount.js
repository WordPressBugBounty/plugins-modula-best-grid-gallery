import apiFetch from '@wordpress/api-fetch';

/**
 * How many galleries and albums have a password now, which turning Password
 * Protect off would remove. Fetched when the admin asks, so the
 * confirmation states the current number.
 *
 * @return {Promise<number>} Count; rejects on a failed or malformed answer.
 */
export async function fetchPasswordProtectedCount() {
	const response = await apiFetch({
		path: '/modula-best-grid-gallery/v1/password-protected',
		method: 'GET',
	});
	const count = response?.count;

	if (!Number.isInteger(count) || count < 0) {
		throw new Error('Unexpected password-protected count.');
	}

	return count;
}
