/**
 * Live preview admin actions live under GalleryPreviewAdminActionsContext
 * inside the preview column. Sidebar (Image panel) reads this ref.
 */

/** @type {import('gallery-shared/context/GalleryPreviewAdminActionsContext').GalleryPreviewAdminActionsValue|null} */
let previewAdminActions = null;

/**
 * @param {import('gallery-shared/context/GalleryPreviewAdminActionsContext').GalleryPreviewAdminActionsValue|null} next
 */
export function setGalleryPreviewAdminActions(next) {
	previewAdminActions = next;
}

/**
 * @return {import('gallery-shared/context/GalleryPreviewAdminActionsContext').GalleryPreviewAdminActionsValue|null}
 */
export function getGalleryPreviewAdminActions() {
	return previewAdminActions;
}
