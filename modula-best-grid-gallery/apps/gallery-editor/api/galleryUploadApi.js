/**
 * REST helpers: modula/v2/gallery/{id}/upload/* (folder import, zip extract, add-images).
 */
import apiFetch from '@wordpress/api-fetch';
import { __ } from '@wordpress/i18n';

/**
 * @param {number}                  galleryId
 * @param {string}                  suffix    Route segment after …/upload/
 * @param {Record<string, unknown>} [data]
 */
export function galleryUploadPost(galleryId, suffix, data = {}) {
	const id = Number(galleryId);
	if (!id) {
		return Promise.reject(new Error('Invalid gallery ID'));
	}
	return apiFetch({
		path: `modula/v2/gallery/${id}/upload/${suffix}`,
		method: 'POST',
		data,
	});
}

/**
 * @param {unknown} raw wp.Uploader / async-upload response body
 * @return {number} Attachment id, or 0 when missing or invalid.
 */
export function parseUploadAttachmentId(raw) {
	if (raw === null || raw === undefined || raw === '') {
		return 0;
	}
	const s = String(raw).trim();
	if (/^\d+$/.test(s)) {
		return parseInt(s, 10);
	}
	try {
		const o = JSON.parse(s);
		if (o?.data?.id) {
			return parseInt(o.data.id, 10);
		}
		if (o?.id) {
			return parseInt(o.id, 10);
		}
	} catch {
		/* ignore */
	}
	return 0;
}

/**
 * Create one attachment per server file (`import-media-file`, which may
 * delete the source file). The files are in the Media Library at once, like
 * an upload; the gallery is not touched, so a never-saved gallery stays an
 * auto-draft (spec decision 30). Stops at the first failed file.
 *
 * @param {number}                                                                                galleryId
 * @param {string[]}                                                                              files
 * @param {{ deleteFiles: boolean, onImportProgress?: (current: number, total: number) => void }} opts
 * @return {Promise<number[]>} Attachment ids, in file order.
 */
async function importServerFilesToMediaLibrary(
	galleryId,
	files,
	{ deleteFiles, onImportProgress }
) {
	const total = files.length;
	const ids = [];
	for (let i = 0; i < total; i++) {
		onImportProgress?.(i + 1, total);
		const row = await galleryUploadPost(galleryId, 'import-media-file', {
			file: files[i],
			delete_files: Boolean(deleteFiles),
		});
		const aid = Number(row?.attachment_id) || 0;
		if (aid) {
			ids.push(aid);
		}
	}
	return ids;
}

/**
 * Validate folder paths → list files → create the attachments. Writes no
 * gallery row: the caller adds the ids as unsaved changes (ADR 0059).
 *
 * @param {number}                                                                                                                           galleryId
 * @param {string[]}                                                                                                                         folderPaths Absolute server paths under uploads.
 * @param {{ deleteFiles: boolean, onImportProgress?: (c: number, t: number) => void, onPhase?: (phase: 'paths'|'files'|'import') => void }} opts
 * @return {Promise<number[]>} Attachment ids, in file order.
 */
export async function importFoldersToMediaLibrary(
	galleryId,
	folderPaths,
	{ deleteFiles, onImportProgress, onPhase }
) {
	onPhase?.('paths');
	const pathsRes = await galleryUploadPost(galleryId, 'check-paths', {
		paths: folderPaths,
	});
	const folders = Array.isArray(pathsRes?.folders) ? pathsRes.folders : [];
	if (!folders.length) {
		throw new Error(
			__('No valid folders after validation.', 'modula-best-grid-gallery')
		);
	}
	onPhase?.('files');
	const filesRes = await galleryUploadPost(galleryId, 'check-files', {
		paths: folders,
	});
	const files = Array.isArray(filesRes?.files) ? filesRes.files : [];
	if (!files.length) {
		throw new Error(
			__(
				'No valid image files found in selection.',
				'modula-best-grid-gallery'
			)
		);
	}
	onPhase?.('import');
	return importServerFilesToMediaLibrary(galleryId, files, {
		deleteFiles,
		onImportProgress,
	});
}

/**
 * Full interleaved list (images + v2 embedded rows). Updates modula-images (images only) + modula_images_v2.
 *
 * @param {number}                    galleryId
 * @param {Record<string, unknown>[]} items     Mixed rows in display order.
 * @return {Promise<{ ok?: boolean }>} Result from the save-merged-items endpoint.
 */
export function saveMergedGalleryItems(galleryId, items) {
	return galleryUploadPost(galleryId, 'save-merged-items', { items });
}

/**
 * @param {number} galleryId
 * @param {string} sorting   Whitelisted `modulaSorting` key.
 */
export function gallerySetSortingMode(galleryId, sorting) {
	return /** @type {Promise<{ ok?: boolean, sorting?: string }>} */ (
		galleryUploadPost(galleryId, 'set-gallery-sorting', { sorting })
	);
}

/**
 * Create a media library attachment from a browser File (WordPress REST — no Plupload/jQuery).
 *
 * @param {File} file Local image file.
 * @return {Promise<{ id?: number }>} Created media object from the REST API.
 */
export function uploadAttachmentFileViaWpRest(file) {
	if (!(file instanceof File)) {
		return Promise.reject(new Error('Invalid file'));
	}
	const formData = new FormData();
	formData.append('file', file, file.name);
	return apiFetch({
		path: '/wp/v2/media',
		method: 'POST',
		body: formData,
	});
}

/**
 * Upload local image files to the Media Library (WP REST media, one file at a
 * time). The files are stored at once; adding them to the gallery is the
 * caller's unsaved change (ADR 0059).
 *
 * @param {File[]|FileList}                                                                 files
 * @param {{ onProgress?: (current: number, total: number) => void, signal?: AbortSignal }} opts
 * @return {Promise<{ ids: number[] }>} Attachment ids of the uploaded files.
 */
export async function uploadBrowserImageFilesToMediaLibrary(files, opts) {
	const list = Array.from(files).filter(
		(f) =>
			f instanceof File &&
			(f.type.startsWith('image/') ||
				/\.(jpe?g|png|gif|webp|avif|bmp|svg)$/i.test(f.name))
	);
	if (!list.length) {
		return { ids: [] };
	}
	const ids = [];
	for (let i = 0; i < list.length; i++) {
		if (opts.signal?.aborted) {
			throw new DOMException('Aborted', 'AbortError');
		}
		opts.onProgress?.(i + 1, list.length);
		const media = await uploadAttachmentFileViaWpRest(list[i]);
		const id = Number(media?.id);
		if (id) {
			ids.push(id);
		}
	}
	return { ids };
}

/**
 * After a .zip is uploaded as an attachment, extract it and create the
 * attachments. Writes no gallery row (ADR 0059).
 *
 * @param {number}                                                                                                                                   galleryId
 * @param {number}                                                                                                                                   attachmentId
 * @param {{ deleteFiles: boolean, onImportProgress?: (c: number, t: number) => void, onPhase?: (phase: 'unzip'|'paths'|'files'|'import') => void }} opts
 * @return {Promise<number[]>} Attachment ids, in file order.
 */
export async function importZipToMediaLibrary(
	galleryId,
	attachmentId,
	{ deleteFiles, onImportProgress, onPhase }
) {
	onPhase?.('unzip');
	const unzipRes = await galleryUploadPost(galleryId, 'unzip', {
		file_id: attachmentId,
	});
	const folders = Array.isArray(unzipRes?.folders) ? unzipRes.folders : [];
	if (!folders.length) {
		throw new Error(
			__(
				'ZIP did not contain usable image folders.',
				'modula-best-grid-gallery'
			)
		);
	}
	return importFoldersToMediaLibrary(galleryId, folders, {
		deleteFiles,
		onImportProgress,
		onPhase,
	});
}
