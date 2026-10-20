import { useEffect } from '@wordpress/element';

/**
 * Logs a console error in development builds (`npm run start`), so a config
 * the page cannot draw is noticed while the card or row shows its
 * unavailable state. Production builds stay quiet.
 *
 * @param {string} message
 */
export function useDevelopmentError(message) {
	useEffect(() => {
		if ('production' === process.env.NODE_ENV) {
			return;
		}
		console.error(message);
	}, [message]);
}
