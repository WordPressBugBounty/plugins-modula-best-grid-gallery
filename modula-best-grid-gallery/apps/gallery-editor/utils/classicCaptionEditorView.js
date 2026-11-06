/**
 * Which tab of a classic caption editor (`WpClassicCaptionEditor`) holds the
 * live caption.
 */

/**
 * Whether the Code (Text) tab is active. WordPress' `switchEditors` marks the
 * `wp-{id}-wrap` wrapper `html-active` and only hides the TinyMCE instance, so
 * the instance alone would still report the stale Visual content.
 *
 * @param {string} editorId The caption textarea id.
 * @return {boolean}
 */
export function isClassicCaptionCodeViewActive(editorId) {
	if (typeof document === 'undefined') {
		return false;
	}
	const wrap = document.getElementById(`wp-${editorId}-wrap`);
	return (
		wrap instanceof HTMLElement && wrap.classList.contains('html-active')
	);
}
