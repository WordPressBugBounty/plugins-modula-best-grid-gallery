/**
 * Anchored dropdown panel for selection-bar menus.
 */
import { useEffect, useRef } from '@wordpress/element';

/**
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   children: import('react').ReactNode,
 *   className?: string,
 *   align?: 'start' | 'end',
 * }} props
 */
export default function SelectionBarMenu({
	open,
	onClose,
	children,
	className = '',
	align = 'start',
}) {
	const menuRef = useRef(/** @type {HTMLDivElement | null} */ (null));

	useEffect(() => {
		if (!open) {
			return undefined;
		}
		const onDoc = (e) => {
			const el = menuRef.current;
			if (!el) {
				return;
			}
			const target = e.target;
			if (target instanceof Node && el.contains(target)) {
				return;
			}
			/* Keep open when clicking the trigger (handled by parent toggle). */
			if (
				target instanceof Element &&
				target.closest(
					'.modula-gallery-takeover__selection-bar-act[aria-expanded="true"]'
				)
			) {
				return;
			}
			onClose();
		};
		const onKey = (e) => {
			if (e.key === 'Escape') {
				e.preventDefault();
				e.stopPropagation();
				onClose();
			}
		};
		document.addEventListener('mousedown', onDoc, true);
		window.addEventListener('keydown', onKey, true);
		return () => {
			document.removeEventListener('mousedown', onDoc, true);
			window.removeEventListener('keydown', onKey, true);
		};
	}, [open, onClose]);

	if (!open) {
		return null;
	}

	const classes = [
		'modula-gallery-takeover__selection-bar-menu',
		align === 'end' ? 'is-align-end' : '',
		className.trim(),
	]
		.filter(Boolean)
		.join(' ');

	return (
		<div ref={menuRef} className={classes} role="menu">
			{children}
		</div>
	);
}
