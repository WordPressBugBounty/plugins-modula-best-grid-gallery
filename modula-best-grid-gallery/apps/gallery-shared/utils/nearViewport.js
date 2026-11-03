/**
 * When a visitor gallery mounts with lazy load on: once its root comes within
 * 200px of the viewport, as Lite's gallery loader and Pro's album visitor
 * schedule it.
 *
 * @package
 */

/** How close (px) a root comes to the viewport before it mounts. */
const NEAR_VIEWPORT_MARGIN_PX = 200;

/**
 * @param {HTMLElement} element Gallery root.
 * @return {boolean} Whether it is laid out within the margin of the viewport.
 */
function isElementNearViewport(element) {
	const rect = element.getBoundingClientRect();
	return (
		rect.bottom >= -NEAR_VIEWPORT_MARGIN_PX &&
		rect.top <=
			(window.innerHeight || document.documentElement.clientHeight) +
				NEAR_VIEWPORT_MARGIN_PX &&
		rect.right >= 0 &&
		rect.width > 0
	);
}

/**
 * Calls `onNear` once the element is near the viewport: now when it already
 * is or the browser has no IntersectionObserver, else on the first
 * intersection that finds it laid out there.
 *
 * @param {HTMLElement} element Gallery root.
 * @param {() => void}  onNear  Called once.
 * @return {IntersectionObserver|null} The observer waiting for it, to disconnect when the root goes away; null when `onNear` already ran.
 */
export function observeNearViewport(element, onNear) {
	if (isElementNearViewport(element) || !('IntersectionObserver' in window)) {
		onNear();
		return null;
	}
	const observer = new window.IntersectionObserver(
		(entries) => {
			const isNear = entries.some(
				(entry) =>
					entry.isIntersecting && isElementNearViewport(entry.target)
			);
			if (!isNear) {
				return;
			}
			observer.disconnect();
			onNear();
		},
		{ rootMargin: `${NEAR_VIEWPORT_MARGIN_PX}px 0px`, threshold: 0 }
	);
	observer.observe(element);
	return observer;
}
