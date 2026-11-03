import {
	useEffect,
	useId,
	useLayoutEffect,
	useRef,
	useState,
} from '@wordpress/element';
import { placeTooltip } from './placeTooltip';

/**
 * @typedef {Object} TooltipTriggerProps
 * @property {string}   'aria-describedby' The tip's id: it describes the trigger.
 * @property {Function} onKeyDown          Escape hides the tip.
 */

/**
 * A short line of help beside a control (a settings row's ⓘ). `trigger`
 * receives the props that wire the button to the tip; spread them on a
 * button. The tip opens while the trigger is hovered or focused; Escape
 * hides it (on the focused trigger it stops there, so a dialog around it
 * stays open). It ignores the pointer, so inside a `<label>` a click on it
 * cannot reach the labelled control. It describes the trigger
 * (`aria-describedby`), so a screen reader reads it after the button's
 * name, and it stays in the page while hidden so the description is always
 * there. It takes no focus and holds nothing interactive.
 *
 * The tip is `position: fixed` next to the trigger (`placeTooltip`), so a
 * scrolling panel does not clip it, and it follows the trigger while open.
 *
 * @param {Object}   props
 * @param {string}   props.text    The tip.
 * @param {Function} props.trigger Receives TooltipTriggerProps, returns the button.
 */
export function Tooltip({ text, trigger }) {
	const anchorRef = useRef(null);
	const tipRef = useRef(null);
	const [hovered, setHovered] = useState(false);
	const [focused, setFocused] = useState(false);
	// Escape hides the tip until the trigger is hovered or focused again.
	const [dismissed, setDismissed] = useState(false);
	const [position, setPosition] = useState(null);
	const tipId = `modula-admin-tooltip-${useId()}`;
	const open = (hovered || focused) && !dismissed;

	useLayoutEffect(() => {
		if (!open) {
			setPosition(null);
			return undefined;
		}
		const tip = tipRef.current;
		const view = tip.ownerDocument.defaultView;
		const place = () =>
			setPosition(
				placeTooltip(
					anchorRef.current.getBoundingClientRect(),
					{ width: tip.offsetWidth, height: tip.offsetHeight },
					{ width: view.innerWidth, height: view.innerHeight }
				)
			);
		place();
		// Scrolling the settings panel moves the trigger: follow it.
		view.addEventListener('resize', place);
		view.addEventListener('scroll', place, true);

		return () => {
			view.removeEventListener('resize', place);
			view.removeEventListener('scroll', place, true);
		};
	}, [open, text]);

	// A tip opened by hover alone is hidden by Escape wherever focus is. It
	// leaves the key to the page; the focused trigger handles its own below.
	useEffect(() => {
		if (!open || focused) {
			return undefined;
		}
		const doc = tipRef.current.ownerDocument;
		const hideOnEscape = (event) => {
			if ('Escape' === event.key) {
				setDismissed(true);
			}
		};
		doc.addEventListener('keydown', hideOnEscape);

		return () => doc.removeEventListener('keydown', hideOnEscape);
	}, [open, focused]);

	const show = (setter) => () => {
		setter(true);
		setDismissed(false);
	};

	const triggerProps = {
		'aria-describedby': tipId,
		onKeyDown: (event) => {
			if (open && 'Escape' === event.key) {
				// Only the tip closes, not the panel or dialog around it.
				event.preventDefault();
				event.stopPropagation();
				setDismissed(true);
			}
		},
	};

	return (
		<span
			ref={anchorRef}
			className="modula-admin-tooltip-anchor"
			onMouseEnter={show(setHovered)}
			onMouseLeave={() => setHovered(false)}
			onFocus={show(setFocused)}
			onBlur={() => setFocused(false)}
		>
			{trigger(triggerProps)}
			<span
				ref={tipRef}
				id={tipId}
				role="tooltip"
				hidden={!open}
				className="modula-admin-tooltip"
				// Measured unseen first, then placed before paint.
				style={position ?? { visibility: 'hidden' }}
			>
				{text}
			</span>
		</span>
	);
}
