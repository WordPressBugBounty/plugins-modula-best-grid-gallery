/**
 * The gallery editor's parts in the editor save session (ADR 0059): items,
 * then settings, then the post fields (title and status). The first save of a
 * never-saved gallery writes the post fields first, so a gallery saved as
 * Draft is never promoted to Published by a content write (spec decision 9).
 */
export const GALLERY_SAVE_PARTS = Object.freeze({
	items: 'items',
	settings: 'settings',
	postFields: 'post-fields',
});

export const GALLERY_SAVE_ORDER = Object.freeze([
	GALLERY_SAVE_PARTS.items,
	GALLERY_SAVE_PARTS.settings,
	GALLERY_SAVE_PARTS.postFields,
]);

export const GALLERY_FIRST_SAVE_ORDER = Object.freeze([
	GALLERY_SAVE_PARTS.postFields,
	GALLERY_SAVE_PARTS.items,
	GALLERY_SAVE_PARTS.settings,
]);
