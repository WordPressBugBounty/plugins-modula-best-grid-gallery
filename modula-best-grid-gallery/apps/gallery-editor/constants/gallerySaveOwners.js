/**
 * Write owners the gallery editor reports to the shared takeover save status.
 * A failure of one owner stays visible until a later write of that owner succeeds.
 * Settings are not an owner: they save through the editor save session
 * (`gallerySaveParts.js`). `previewItems` is the items part's own save and
 * `postFields` the post fields part's (title and status).
 */
export const GALLERY_SAVE_OWNERS = Object.freeze({
	previewItems: 'preview-items',
	postFields: 'post-fields',
});
