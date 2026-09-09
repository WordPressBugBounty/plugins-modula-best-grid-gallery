import { useCallback, useRef } from '@wordpress/element';

/**
 * Save / restore `document.activeElement` when opening a modal from a trigger control.
 *
 * @return {{ saveReturnFocus: () => void, restoreReturnFocus: () => void }}
 */
export function useFocusReturn() {
	const returnFocusRef = useRef(/** @type {HTMLElement|null} */ (null));

	const saveReturnFocus = useCallback(() => {
		const active = document.activeElement;
		returnFocusRef.current =
			active instanceof HTMLElement ? active : null;
	}, []);

	const restoreReturnFocus = useCallback(() => {
		const target = returnFocusRef.current;
		returnFocusRef.current = null;
		if (
			target &&
			typeof target.focus === 'function' &&
			target.isConnected
		) {
			target.focus({ preventScroll: true });
		}
	}, []);

	return { saveReturnFocus, restoreReturnFocus };
}
