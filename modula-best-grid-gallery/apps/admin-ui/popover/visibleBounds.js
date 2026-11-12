/**
 * The trigger's scroll containers: the panel stays inside what they show,
 * so it never covers the chrome around them (the top bar over the settings
 * panel). Clipping-only ancestors (a card's rounded `overflow: hidden`) do
 * not count; they are what the panel must escape.
 *
 * @param {Element} element The anchor.
 * @return {Element[]} Scrollable ancestors, nearest first.
 */
export function scrollContainersOf(element) {
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
 * Whether the container's content is taller than its box. CSS turns a lone
 * `overflow-x: auto` (a table that scrolls sideways on narrow windows) into
 * `auto` on both axes, so the computed style cannot tell a sideways-only
 * scroller from one that scrolls up and down; its content can.
 *
 * @param {Element} container
 * @return {boolean} True when it scrolls up and down.
 */
function scrollsVertically(container) {
	return container.scrollHeight > container.clientHeight;
}

/**
 * The part of the window the trigger can be seen in: the window without its
 * scrollbars, cut down to each scroll container's box. A container sets the
 * top and bottom only when it scrolls up and down: one that cannot never
 * moves the trigger out of sight vertically, and its foot is just where the
 * page's content ends (a two-row listing), not chrome to stay off.
 *
 * @param {Element[]} containers
 * @param {Document}  doc
 * @return {import('./placePopover').Box} Bounds in window coordinates.
 */
export function visibleBounds(containers, doc) {
	const bounds = {
		top: 0,
		left: 0,
		right: doc.documentElement.clientWidth,
		bottom: doc.documentElement.clientHeight,
	};
	for (const container of containers) {
		const box = container.getBoundingClientRect();
		bounds.left = Math.max(bounds.left, box.left);
		bounds.right = Math.min(bounds.right, box.right);
		if (!scrollsVertically(container)) {
			continue;
		}
		bounds.top = Math.max(bounds.top, box.top);
		bounds.bottom = Math.min(bounds.bottom, box.bottom);
	}
	return bounds;
}
