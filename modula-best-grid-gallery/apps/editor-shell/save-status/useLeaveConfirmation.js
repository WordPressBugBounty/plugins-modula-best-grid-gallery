import { useEffect } from '@wordpress/element';

/**
 * Asks the browser to confirm leaving the page (close, reload, a link, any
 * navigation away) while `shouldConfirm` is true. Same rule as the general
 * settings page's `useUnsavedChangesGuard`.
 *
 * @param {boolean} shouldConfirm
 */
export function useLeaveConfirmation(shouldConfirm) {
	useEffect(() => {
		if (!shouldConfirm) {
			return undefined;
		}
		const warn = (event) => {
			event.preventDefault();
			// Older browsers show the prompt only when returnValue is set.
			event.returnValue = '';
		};
		window.addEventListener('beforeunload', warn);

		return () => window.removeEventListener('beforeunload', warn);
	}, [shouldConfirm]);
}
