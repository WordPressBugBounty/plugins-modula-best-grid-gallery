/**
 * Toggle expandable social popover on a gallery tile (no jQuery).
 *
 * @package
 */

import { useCallback, useEffect, useId, useRef, useState } from '@wordpress/element';

const CLOSE_EVENT = 'modula-expandable-socials-close';

/**
 * @param {HTMLElement} el
 * @return {boolean}
 */
function isOutOfHorizontalViewport(el) {
	const rect = el.getBoundingClientRect();
	const windowWidth =
		window.innerWidth || document.documentElement.clientWidth;
	return rect.left < 0 || rect.right > windowWidth;
}

/**
 * @return {{
 *   open: boolean,
 *   flipRight: boolean,
 *   fabRef: import('react').RefObject<HTMLDivElement|null>,
 *   iconsRef: import('react').RefObject<HTMLDivElement|null>,
 *   onFabClick: (event: import('react').SyntheticEvent) => void,
 * }}
 */
export function useExpandableSocials() {
	const [open, setOpen] = useState(false);
	const [flipRight, setFlipRight] = useState(false);
	const fabRef = useRef(null);
	const iconsRef = useRef(null);
	const instanceId = useId();

	const onFabClick = useCallback(
		(event) => {
			event.preventDefault();
			event.stopPropagation();
			const root =
				fabRef.current?.closest?.('.modula-items') ||
				fabRef.current?.closest?.('.modula') ||
				document;
			root.dispatchEvent(
				new CustomEvent(CLOSE_EVENT, {
					bubbles: true,
					detail: { exceptId: instanceId },
				})
			);
			setOpen((prev) => !prev);
		},
		[instanceId]
	);

	useEffect(() => {
		const onClose = (event) => {
			if (event.detail?.exceptId === instanceId) {
				return;
			}
			setOpen(false);
		};
		document.addEventListener(CLOSE_EVENT, onClose);
		return () => {
			document.removeEventListener(CLOSE_EVENT, onClose);
		};
	}, [instanceId]);

	useEffect(() => {
		if (!open) {
			setFlipRight(false);
			return undefined;
		}
		const icons = iconsRef.current;
		if (icons && isOutOfHorizontalViewport(icons)) {
			setFlipRight(true);
		} else {
			setFlipRight(false);
		}

		const onDocPointer = (event) => {
			const fab = fabRef.current;
			const iconsEl = iconsRef.current;
			const target = event.target;
			if (fab?.contains?.(target) || iconsEl?.contains?.(target)) {
				return;
			}
			setOpen(false);
		};

		document.addEventListener('pointerdown', onDocPointer, true);
		return () => {
			document.removeEventListener('pointerdown', onDocPointer, true);
		};
	}, [open]);

	return { open, flipRight, fabRef, iconsRef, onFabClick };
}
