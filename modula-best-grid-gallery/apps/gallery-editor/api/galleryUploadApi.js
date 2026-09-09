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
 * @param {number}                                                                                                        galleryId
 * @param {string[]}                                                                                                      files
 * @param {{ deleteFiles: boolean, uploadPosition: string, onImportProgress?: (current: number, total: number) => void }} opts
 */
export async function importServerFilesToGallery(
	galleryId,
	files,
	{ deleteFiles, uploadPosition, onImportProgress }
) {
	const total = files.length;
	const ids = [];
	for (let i = 0; i < total; i++) {
		onImportProgress?.(i + 1, total);
		const row = await galleryUploadPost(galleryId, 'import-file', {
			file: files[i],
			delete_files: Boolean(deleteFiles),
		});
		const aid = Number(row?.attachment_id) || 0;
		if (aid) {
			ids.push(aid);
		}
	}
	if (ids.length) {
		await galleryUploadPost(galleryId, 'add-images', {
			ids,
			upload_position: uploadPosition === 'start' ? 'start' : 'end',
		});
	}
}

/**
 * Validate folder paths → list files → import (used by folder UI and ZIP extraction).
 *
 * @param {number}                                                                                                                                                   galleryId
 * @param {string[]}                                                                                                                                                 folderPaths Absolute server paths under uploads.
 * @param {{ deleteFiles: boolean, uploadPosition: string, onImportProgress?: (c: number, t: number) => void, onPhase?: (phase: 'paths'|'files'|'import') => void }} opts
 */
export async function runFoldersToGalleryPipeline(
	galleryId,
	folderPaths,
	{ deleteFiles, uploadPosition, onImportProgress, onPhase }
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
	await importServerFilesToGallery(galleryId, files, {
		deleteFiles,
		uploadPosition,
		onImportProgress,
	});
}

/**
 * After a .zip is uploaded as an attachment, extract and import images.
 *
 * @param {number}                                                                                                                                                           galleryId
 * @param {number}                                                                                                                                                           attachmentId
 * @param {{ deleteFiles: boolean, uploadPosition: string, onImportProgress?: (c: number, t: number) => void, onPhase?: (phase: 'unzip'|'paths'|'files'|'import') => void }} opts
 */
/**
 * @param {number} galleryId
 * @param {number} index     Row index in modula-images (0-based, no page breaks).
 */
export function galleryRemoveImageByIndex(galleryId, index) {
	return galleryUploadPost(galleryId, 'remove-image-by-index', {
		index,
	});
}

/**
 * @param {number} galleryId
 * @param {number} index        Row index in modula-images.
 * @param {number} attachmentId New WordPress attachment ID.
 */
export function galleryReplaceImageByIndex(galleryId, index, attachmentId) {
	return galleryUploadPost(galleryId, 'replace-image-by-index', {
		index,
		attachment_id: attachmentId,
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
 * @param {number}                  galleryId
 * @param {number}                  index     Row index in modula-images.
 * @param {Record<string, unknown>} fields    Partial modula-images row.
 */
export function galleryPatchImageByIndex(galleryId, index, fields) {
	return galleryUploadPost(galleryId, 'patch-image-by-index', {
		index,
		fields,
	});
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
 * @param {number}   galleryId
 * @param {number[]} order     Attachment IDs in the new order (multiset must match modula-images).
 */
export function galleryReorderImages(galleryId, order) {
	return /** @type {Promise<{ ok?: boolean }>} */ (
		galleryUploadPost(galleryId, 'reorder-images', { order })
	);
}

/**
 * Single request: update `modulaSorting` and optionally reorder `modula-images` (avoids split REST calls).
 *
 * @param {number}                                galleryId
 * @param {{ sorting: string, order?: number[] }} payload
 */
export function galleryApplySortingAndOrder(galleryId, payload) {
	const { sorting, order } = payload;
	const data =
		order !== undefined && order !== null
			? { sorting, order }
			: { sorting };
	return /** @type {Promise<{ ok?: boolean, sorting?: string }>} */ (
		galleryUploadPost(galleryId, 'apply-sorting-and-order', data)
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
 * Upload local image files: WP REST media for each file, then Modula `add-images` (same end state as legacy Plupload flow).
 *
 * @param {number}                                                                                                  galleryId
 * @param {File[]|FileList}                                                                                         files
 * @param {{ uploadPosition: string, onProgress?: (current: number, total: number) => void, signal?: AbortSignal }} opts
 * @param {(fn: () => void | Promise<void>) => Promise<void>}                                                       runPersistTask Save-bar serialiser from TakeoverSaveStatusContext.
 * @return {Promise<{ ids: number[] }>} Attachment ids successfully added to the gallery.
 */
export async function uploadBrowserImageFilesToGallery(
	galleryId,
	files,
	opts,
	runPersistTask
) {
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
	if (!ids.length) {
		return { ids: [] };
	}
	const pos = opts.uploadPosition === 'start' ? 'start' : 'end';
	await runPersistTask(async () => {
		await galleryUploadPost(galleryId, 'add-images', {
			ids,
			upload_position: pos,
		});
	});
	return { ids };
}

export async function runZipAttachmentPipeline(
	galleryId,
	attachmentId,
	{ deleteFiles, uploadPosition, onImportProgress, onPhase }
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
	await runFoldersToGalleryPipeline(galleryId, folders, {
		deleteFiles,
		uploadPosition,
		onImportProgress,
		onPhase,
	});
}
