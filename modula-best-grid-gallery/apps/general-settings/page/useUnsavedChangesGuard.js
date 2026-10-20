import { useEffect } from '@wordpress/element';

/**
 * Asks the browser to confirm leaving the page while there are unsaved
 * changes.
 *
 * @param {boolean} hasUnsavedChanges
 */
export function useUnsavedChangesGuard(hasUnsavedChanges) {
	useEffect(() => {
		if (!hasUnsavedChanges) {
			return undefined;
		}
		const warn = (event) => {
			event.preventDefault();
			// Older browsers show the prompt only when returnValue is set.
			event.returnValue = '';
		};
		window.addEventListener('beforeunload', warn);

		return () => window.removeEventListener('beforeunload', warn);
	}, [hasUnsavedChanges]);
}
