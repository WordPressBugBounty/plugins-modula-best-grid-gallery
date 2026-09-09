import { useEffect, useLayoutEffect, useRef } from '@wordpress/element';

function isTextInputLikeTarget(target) {
	return (
		target instanceof HTMLInputElement ||
		target instanceof HTMLTextAreaElement ||
		target instanceof HTMLSelectElement ||
		(target && /** @type {HTMLElement} */ (target).isContentEditable)
	);
}

/**
 * Owns Cmd/Ctrl+K inside editor scope so WP core palette does not steal it.
 *
 * @param {{
 *   isOpen: boolean,
 *   setOpen: (next: boolean) => void,
 *   isInScope: (target: EventTarget | null) => boolean,
 * }} args
 */
export function useCommandPaletteHotkey({ isOpen, setOpen, isInScope }) {
	const isOpenRef = useRef(isOpen);
	const setOpenRef = useRef(setOpen);
	const isInScopeRef = useRef(isInScope);

	useLayoutEffect(() => {
		isOpenRef.current = isOpen;
	}, [isOpen]);

	useLayoutEffect(() => {
		setOpenRef.current = setOpen;
	}, [setOpen]);

	useLayoutEffect(() => {
		isInScopeRef.current = isInScope;
	}, [isInScope]);

	useEffect(() => {
		const onKey = (e) => {
			if (!(e.metaKey || e.ctrlKey) || String(e.key).toLowerCase() !== 'k') {
				return;
			}
			if (isOpenRef.current) {
				e.preventDefault();
				e.stopPropagation();
				setOpenRef.current(false);
				return;
			}
			if (!isInScopeRef.current(e.target)) {
				return;
			}
			if (isTextInputLikeTarget(e.target)) {
				e.preventDefault();
				e.stopPropagation();
				return;
			}
			e.preventDefault();
			e.stopPropagation();
			setOpenRef.current(true);
		};
		document.addEventListener('keydown', onKey, true);
		return () => document.removeEventListener('keydown', onKey, true);
	}, []);
}
