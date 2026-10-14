/**
 * Write owners the gallery editor reports to the shared takeover save status.
 * A failure of one owner stays visible until a later write of that owner succeeds.
 */
export const GALLERY_SAVE_OWNERS = Object.freeze({
	settings: 'settings',
	previewItems: 'preview-items',
	template: 'gallery-template',
	clearFocus: 'gallery-clear-focus',
});
