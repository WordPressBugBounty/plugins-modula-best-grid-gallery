import {
	createContext,
	useContext,
	useEffect,
	useId,
	useLayoutEffect,
	useRef,
	useState,
} from '@wordpress/element';
import { placePopover } from './placePopover';

// Lets content inside a popover (MenuItem) close it and return focus.
const PopoverCloseContext = createContext(() => {});

/**
 * @param {import('./placePopover').PopoverPlacement|null} a
 * @param {import('./placePopover').PopoverPlacement}      b
 * @return {boolean} True when both place the panel the same way.
 */
function isSamePlacement(a, b) {
	return (
		a !== null &&
		a.top === b.top &&
		a.left === b.left &&
		a.maxHeight === b.maxHeight &&
		a.side === b.side &&
		a.hidden === b.hidden
	);
}

/**
 * The trigger's scroll containers: the panel stays inside what they show,
 * so it never covers the chrome around them (the top bar over the settings
 * panel). Clipping-only ancestors (a card's rounded `overflow: hidden`) do
 * not count; they are what the panel must escape.
 *
 * @param {Element} element The anchor.
 * @return {Element[]} Scrollable ancestors, nearest first.
 */
function scrollContainersOf(element) {
	const view = element.ownerDocument.defaultView;
	const containers = [];
	for (
		let node = element.parentElement;
		node && node !== element.ownerDocument.body;
		node = node.parentElement
	) {
		const { overflowX, overflowY } = view.getComputedStyle(node);
		if (/auto|scroll/.test(`${overflowX} ${overflowY}`)) {
			containers.push(node);
		}
	}
	return containers;
}

/**
 * The part of the window the trigger can be seen in: the window without its
 * scrollbars, cut down to each scroll container's box.
 *
 * @param {Element[]} containers
 * @param {Document}  doc
 * @return {import('./placePopover').Box} Bounds in window coordinates.
 */
function visibleBounds(containers, doc) {
	const bounds = {
		top: 0,
		left: 0,
		right: doc.documentElement.clientWidth,
		bottom: doc.documentElement.clientHeight,
	};
	for (const container of containers) {
		const box = container.getBoundingClientRect();
		bounds.top = Math.max(bounds.top, box.top);
		bounds.left = Math.max(bounds.left, box.left);
		bounds.right = Math.min(bounds.right, box.right);
		bounds.bottom = Math.min(bounds.bottom, box.bottom);
	}
	return bounds;
}

/**
 * The panel's inline position. Before the first measure it is laid out at
 * the window's corner (so it measures at its full width) but hidden, so it
 * never flashes there; it is hidden too while its trigger is scrolled out
 * of sight. The room on its side goes through a custom property, so a
 * host's own `max-height` still caps it.
 *
 * @param {import('./placePopover').PopoverPlacement|null} placement
 * @return {Object} Inline style.
 */
function placementStyle(placement) {
	if (!placement) {
		return { visibility: 'hidden', top: 0, left: 0 };
	}
	return {
		top: `${placement.top}px`,
		left: `${placement.left}px`,
		'--modula-admin-popover-room': `${placement.maxHeight}px`,
		visibility: placement.hidden ? 'hidden' : undefined,
	};
}

/**
 * Closes the enclosing Popover and returns focus to its trigger.
 *
 * @return {Function} Close callback.
 */
export function usePopoverClose() {
	return useContext(PopoverCloseContext);
}

/**
 * @typedef {Object} PopoverTriggerProps
 * @property {boolean}  'aria-expanded' Whether the panel is open.
 * @property {string}   'aria-haspopup' The panel role.
 * @property {string}   'aria-controls' The panel id; also how focus finds the trigger again.
 * @property {Function} onClick         Toggles the panel.
 * @property {Function} onKeyDown       Opens a menu with the Down arrow.
 */

/**
 * A panel anchored under its trigger (Embed, History, Status). `trigger`
 * receives the props that wire the button to the panel; spread them on a
 * button. Opening moves focus into the panel, to `[data-autofocus="true"]`
 * or else its first control. Escape closes it and returns focus to the
 * trigger; a click outside or Tab out of it closes it and leaves focus
 * where it went.
 *
 * The panel is fixed to the window (`placePopover`), so an ancestor with
 * `overflow: hidden` (a panel card, an accordion) cannot clip it. It stays
 * inside what its trigger's scroll containers show, opens on `side` when it
 * fits there, else on the other side, and scrolls inside when it is taller
 * than the room; it follows its trigger on scroll and resize, and hides
 * while the trigger is scrolled out of sight. An ancestor with a
 * `transform` would become its frame, so none of the editor's popover
 * hosts has one. The caller owns `open`.
 *
 * A panel that opens on hover (the Content page's row preview) passes
 * `focusOnOpen={false}`: focus stays where it is, so moving the pointer never
 * moves it; Tab still reaches the panel's controls.
 *
 * @param {Object}                    props
 * @param {boolean}                   props.open
 * @param {Function}                  props.onOpenChange  Receives the next boolean.
 * @param {Function}                  props.trigger       Receives PopoverTriggerProps, returns the button.
 * @param {string}                    props.label         Panel name.
 * @param {'dialog'|'menu'}           [props.role]
 * @param {'start'|'end'}             [props.align]       Panel edge lined up with the trigger.
 * @param {'bottom'|'top'}            [props.side]        The side it prefers (above for a trigger at the window's foot).
 * @param {Function}                  [props.onKeyDown]   Panel key handler (Menu's arrow keys).
 * @param {string}                    [props.className]   Added to the panel.
 * @param {boolean}                   [props.focusOnOpen] Opening moves focus into the panel.
 * @param {import('react').ReactNode} props.children
 */
export function Popover({
	open,
	onOpenChange,
	trigger,
	label,
	role = 'dialog',
	align = 'start',
	side = 'bottom',
	onKeyDown,
	className = '',
	focusOnOpen = true,
	children,
}) {
	const anchorRef = useRef(null);
	const panelRef = useRef(null);
	const panelId = `modula-admin-popover-${useId()}`;
	// The outside-click listener lives as long as the panel is open; it
	// reads the latest callback instead of re-subscribing on each render.
	const onOpenChangeRef = useRef(onOpenChange);
	const [placement, setPlacement] = useState(null);

	useEffect(() => {
		onOpenChangeRef.current = onOpenChange;
	}, [onOpenChange]);

	// Placed before paint, then kept on the trigger while the page scrolls,
	// the window resizes or the panel's content changes size. Closing drops
	// the placement, so the next open measures afresh.
	useLayoutEffect(() => {
		if (!open) {
			return undefined;
		}
		const panel = panelRef.current;
		const doc = panel.ownerDocument;
		const view = doc.defaultView;
		const containers = scrollContainersOf(anchorRef.current);
		const place = () => {
			const borders = panel.offsetHeight - panel.clientHeight;
			const next = placePopover(
				anchorRef.current.getBoundingClientRect(),
				{
					width: panel.offsetWidth,
					height: panel.scrollHeight + borders,
				},
				visibleBounds(containers, doc),
				{ align, side }
			);
			setPlacement((current) =>
				isSamePlacement(current, next) ? current : next
			);
		};
		place();
		view.addEventListener('resize', place);
		view.addEventListener('scroll', place, true);
		const resizeObserver = view.ResizeObserver
			? new view.ResizeObserver(place)
			: null;
		resizeObserver?.observe(panel);

		return () => {
			view.removeEventListener('resize', place);
			view.removeEventListener('scroll', place, true);
			resizeObserver?.disconnect();
			setPlacement(null);
		};
	}, [open, align, side]);

	// Focus moves in once the panel is placed: before its first measure it
	// is hidden, and a hidden element cannot take focus.
	const placed = placement !== null;
	useEffect(() => {
		if (!open || !placed || !focusOnOpen) {
			return;
		}
		const panel = panelRef.current;
		// A disabled checked option (a select's "Custom") cannot take focus.
		const initial =
			panel.querySelector('[data-autofocus="true"]:not(:disabled)') ??
			panel.querySelector(
				'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'
			) ??
			panel;
		initial.focus();
	}, [open, placed, focusOnOpen]);

	useEffect(() => {
		if (!open) {
			return undefined;
		}
		const panel = panelRef.current;
		const closeOnOutsidePointer = (event) => {
			if (!anchorRef.current.contains(event.target)) {
				onOpenChangeRef.current(false);
			}
		};
		const doc = panel.ownerDocument;
		doc.addEventListener('pointerdown', closeOnOutsidePointer);

		return () =>
			doc.removeEventListener('pointerdown', closeOnOutsidePointer);
	}, [open]);

	const closeAndReturnFocus = () => {
		onOpenChange(false);
		anchorRef.current
			.querySelector(`[aria-controls="${panelId}"]`)
			?.focus();
	};

	const onPanelKeyDown = (event) => {
		if ('Escape' === event.key) {
			// Only this popover closes, not a dialog around it.
			event.preventDefault();
			event.stopPropagation();
			closeAndReturnFocus();
			return;
		}
		onKeyDown?.(event);
	};

	const onAnchorBlur = (event) => {
		const next = event.relatedTarget;
		// A null target (click on plain page) is left to the pointer listener.
		if (open && next && !anchorRef.current.contains(next)) {
			onOpenChange(false);
		}
	};

	const triggerProps = {
		'aria-expanded': open,
		'aria-haspopup': role,
		'aria-controls': panelId,
		onClick: () => onOpenChange(!open),
		onKeyDown: (event) => {
			// Menu buttons also open with the Down arrow.
			if ('menu' === role && 'ArrowDown' === event.key && !open) {
				event.preventDefault();
				onOpenChange(true);
			}
		},
	};

	return (
		<span
			ref={anchorRef}
			className="modula-admin-popover-anchor"
			onBlur={onAnchorBlur}
		>
			{trigger(triggerProps)}
			{open ? (
				<PopoverCloseContext.Provider value={closeAndReturnFocus}>
					<div
						ref={panelRef}
						id={panelId}
						role={role}
						aria-label={label}
						tabIndex={-1}
						className={[
							'modula-admin-popover',
							`is-align-${align}`,
							`is-side-${placement?.side ?? side}`,
							className,
						]
							.filter(Boolean)
							.join(' ')}
						style={placementStyle(placement)}
						onKeyDown={onPanelKeyDown}
					>
						{children}
					</div>
				</PopoverCloseContext.Provider>
			) : null}
		</span>
	);
}
