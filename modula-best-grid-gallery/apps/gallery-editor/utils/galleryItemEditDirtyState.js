/**
 * Unsaved-change detection for the unified gallery item edit modal.
 */
import { defaultImageMetadataValuesFromItem } from '../form/useImageMetadataForm';
import {
	contentBlockStateToSaveFields,
	createContentBlockEditInitialState,
} from './contentBlockEditState';

/**
 * @param {string} editorInstanceKey
 * @return {string|undefined} Live caption HTML when editor exists.
 */
export function snapshotCaptionFromImageMetadataEditor(editorInstanceKey) {
	if (
		typeof window === 'undefined' ||
		typeof editorInstanceKey !== 'string' ||
		!editorInstanceKey
	) {
		return undefined;
	}
	const editorId = `modula-img-meta-caption-${editorInstanceKey}`;
	const ed =
		window.tinymce && typeof window.tinymce.get === 'function'
			? window.tinymce.get(editorId)
			: null;
	if (ed && !ed.removed && typeof ed.getContent === 'function') {
		return ed.getContent();
	}
	if (typeof document === 'undefined') {
		return undefined;
	}
	const ta = document.getElementById(editorId);
	if (ta && typeof ta.value === 'string') {
		return ta.value;
	}
	return undefined;
}

/**
 * @param {import('@tanstack/react-form').ReactFormExtendedApi} form
 * @param {number} storeIndex
 * @param {number} attachmentId
 * @return {Object}
 */
export function collectImageMetadataEditValues(form, storeIndex, attachmentId) {
	const captionLive = snapshotCaptionFromImageMetadataEditor(
		`${storeIndex}-${attachmentId}`
	);
	return {
		...form.state.values,
		...(captionLive !== undefined ? { description: captionLive } : {}),
	};
}

/**
 * @param {Object} values
 * @return {string}
 */
function imageMetadataValuesSignature(values) {
	return JSON.stringify(values);
}

/**
 * @param {Object|null} item
 * @param {import('@tanstack/react-form').ReactFormExtendedApi} form
 * @param {number} storeIndex
 * @param {number} attachmentId
 * @return {boolean}
 */
export function isImageMetadataEditDirty(item, form, storeIndex, attachmentId) {
	if (!item) {
		return false;
	}
	const current = collectImageMetadataEditValues(
		form,
		storeIndex,
		attachmentId
	);
	const baseline = defaultImageMetadataValuesFromItem(item);
	return (
		imageMetadataValuesSignature(current) !==
		imageMetadataValuesSignature(baseline)
	);
}

/**
 * @param {Object|null} item
 * @param {() => Object|undefined} getSavePayload
 * @return {boolean}
 */
export function isContentBlockEditDirty(item, getSavePayload) {
	if (!item || typeof getSavePayload !== 'function') {
		return false;
	}
	const payload = getSavePayload();
	if (!payload) {
		return false;
	}
	const stripPreviewOnly = (fields) => {
		const next = { ...fields };
		delete next.blockBackgroundImageUrl;
		return next;
	};
	const current = stripPreviewOnly(contentBlockStateToSaveFields(payload));
	const baseline = stripPreviewOnly(
		contentBlockStateToSaveFields(createContentBlockEditInitialState(item))
	);
	return JSON.stringify(current) !== JSON.stringify(baseline);
}
