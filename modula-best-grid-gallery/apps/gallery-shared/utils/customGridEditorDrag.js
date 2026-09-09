/**
 * Interact.js cancel targets for custom-grid RGL in the settings editor.
 *
 * Lock / pick / watermark chrome must not start a drag. The full-tile select
 * hit must still start a drag so tiles can be rearranged.
 *
 * @package
 */

/**
 * @return {string} Interact.js cancel selector for lock, pick, and watermark chrome.
 */
export function getCustomGridEditorDragCancelSelector() {
	return [
		'.modula-gallery-preview-item-admin__lock-badge',
		'.modula-gallery-preview-item-admin__lock-badge *',
		'.modula-gallery-preview-item-admin__pick',
		'.modula-gallery-preview-item-admin__pick *',
		'.modula-gallery-preview-item-admin__wm-select-btn',
		'.modula-gallery-preview-item-admin__wm-select-btn *',
	].join(', ');
}
