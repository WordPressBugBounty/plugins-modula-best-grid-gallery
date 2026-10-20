import { useEffect, useRef, useState } from '@wordpress/element';

/**
 * Keeps keyboard focus in place when an action swaps its buttons (Disconnect
 * for its confirmation, and back on Cancel). Mark the buttons with
 * `data-focus="<name>"` inside the returned ref and call `focusNext(name)` in
 * the handler that swaps them; after the re-render that button gets focus.
 * Nothing is focused on mount.
 *
 * @return {{ ref: Object, focusNext: Function }} Container ref and the setter.
 */
export function useFocusTarget() {
	const ref = useRef(null);
	const [target, setTarget] = useState(null);

	useEffect(() => {
		if (null === target) {
			return;
		}
		ref.current?.querySelector(`[data-focus="${target}"]`)?.focus();
	}, [target]);

	return { ref, focusNext: setTarget };
}
