/**
 * Bound gallery editor chrome policy (Add New / drop / Replace / Hide copy).
 * Pure helpers — no DOM. Bind summary comes from `modulaSettingsEditor.boundGallery`.
 */

import { __ } from '@wordpress/i18n';

/**
 * @typedef {{
 *   bound?: boolean,
 *   entitled?: boolean,
 *   targetType?: string,
 *   displayName?: string,
 *   missing?: boolean,
 *   openInMediaLibraryUrl?: string|null,
 *   hiddenItems?: Array<{ id: number, title: string, thumbnailUrl?: string }>,
 * }} BoundGallerySummary
 */

/**
 * @param {unknown} summary
 * @return {summary is BoundGallerySummary}
 */
export function isBoundGallerySummary(summary) {
	return Boolean(
		summary &&
			typeof summary === 'object' &&
			/** @type {BoundGallerySummary} */ (summary).bound === true
	);
}

/**
 * @param {Record<string, unknown>|null|undefined} editor
 * @return {BoundGallerySummary|null}
 */
export function getBoundGallerySummaryFromEditor(editor) {
	const summary = editor?.boundGallery;
	return isBoundGallerySummary(summary) ? summary : null;
}

/**
 * @param {BoundGallerySummary|null|undefined} summary
 * @return {boolean}
 */
export function isBoundGalleryEditor(summary) {
	return isBoundGallerySummary(summary);
}

/**
 * Attachment ingest paths are off on bound galleries.
 *
 * @param {BoundGallerySummary|null|undefined} summary
 * @return {boolean}
 */
export function boundGalleryAllowsAttachmentIngest(summary) {
	return !isBoundGallerySummary(summary);
}

/**
 * @param {BoundGallerySummary|null|undefined} summary
 * @return {boolean}
 */
export function boundGalleryAllowsCanvasDrop(summary) {
	return !isBoundGallerySummary(summary);
}

/**
 * @param {BoundGallerySummary|null|undefined} summary
 * @return {boolean}
 */
export function boundGalleryAllowsReplace(summary) {
	return !isBoundGallerySummary(summary);
}

/**
 * Primary Add new control action when bound vs unbound.
 *
 * @param {BoundGallerySummary|null|undefined} summary
 * @return {'content-block'|'upload'}
 */
export function boundGalleryPrimaryAddNewAction(summary) {
	return isBoundGallerySummary(summary) ? 'content-block' : 'upload';
}

/** Caret menu row ids kept when the gallery is bound. */
export const BOUND_GALLERY_CARET_ROW_IDS = [
	'content-block',
	'video',
	'playlist',
	'instagram',
	'content-galleries',
];

/** Attachment ingest row ids omitted when bound. */
export const BOUND_GALLERY_INGEST_ROW_IDS = [
	'upload',
	'library',
	'folder',
	'zip',
];

/**
 * @param {{ id?: string }} row
 * @param {BoundGallerySummary|null|undefined} summary
 * @return {boolean}
 */
export function isBoundGalleryAddNewRowAllowed(row, summary) {
	if (!isBoundGallerySummary(summary)) {
		return true;
	}
	const id = typeof row?.id === 'string' ? row.id : '';
	if (BOUND_GALLERY_INGEST_ROW_IDS.includes(id)) {
		return false;
	}
	return BOUND_GALLERY_CARET_ROW_IDS.includes(id);
}

/**
 * Filter Add New menu rows for a bound gallery (omit ingest paths).
 *
 * @template {{ id?: string }} T
 * @param {T[]} rows
 * @param {BoundGallerySummary|null|undefined} summary
 * @return {T[]}
 */
export function filterAddNewRowsForBoundGallery(rows, summary) {
	if (!isBoundGallerySummary(summary) || !Array.isArray(rows)) {
		return rows;
	}
	return rows.filter((row) => isBoundGalleryAddNewRowAllowed(row, summary));
}

/**
 * Source image remove copy on a bound gallery.
 *
 * @param {BoundGallerySummary|null|undefined} summary
 * @param {{ isSourceImage?: boolean }} [opts]
 * @return {{
 *   actionLabel: string,
 *   confirmLabel: string,
 *   confirmBody: string,
 *   isHide: boolean,
 * }}
 */
export function getBoundGalleryRemoveCopy(summary, opts = {}) {
	const isSource = opts.isSourceImage !== false;
	if (isBoundGallerySummary(summary) && isSource) {
		return {
			isHide: true,
			actionLabel: __('Hide from this gallery', 'modula-best-grid-gallery'),
			confirmLabel: __('Hide', 'modula-best-grid-gallery'),
			confirmBody: __(
				'Hide this image from this gallery?',
				'modula-best-grid-gallery'
			),
		};
	}
	return {
		isHide: false,
		actionLabel: __('Remove', 'modula-best-grid-gallery'),
		confirmLabel: __('Confirm remove?', 'modula-best-grid-gallery'),
		confirmBody: __(
			'Remove this image from the gallery?',
			'modula-best-grid-gallery'
		),
	};
}
