/**
 * Unsaved-change detection for the unified gallery item edit modal.
 */
import { defaultImageMetadataValuesFromItem } from '../form/useImageMetadataForm';
import { isClassicCaptionCodeViewActive } from './classicCaptionEditorView';
import {
	contentBlockStateToSaveFields,
	createContentBlockEditInitialState,
} from './contentBlockEditState';

/**
 * The live caption from the editor's active tab: the TinyMCE content on the
 * Visual tab, the textarea on the Code tab or before TinyMCE mounts.
 *
 * @param {string} editorInstanceKey
 * @return {string|undefined} Live caption HTML while the editor is in the document.
 */
export function snapshotCaptionFromImageMetadataEditor(editorInstanceKey) {
	if (
		typeof window === 'undefined' ||
		typeof document === 'undefined' ||
		typeof editorInstanceKey !== 'string' ||
		!editorInstanceKey
	) {
		return undefined;
	}
	const editorId = `modula-img-meta-caption-${editorInstanceKey}`;
	const ta = document.getElementById(editorId);
	// On the panel's unmount flush the editor has already left the document
	// while its TinyMCE instance is not removed yet. The active tab can no
	// longer be read there, and after a Code tab edit the hidden instance still
	// holds the old caption; the form has every change the editor reported.
	if (!ta) {
		return undefined;
	}
	const ed =
		window.tinymce && typeof window.tinymce.get === 'function'
			? window.tinymce.get(editorId)
			: null;
	const visualEditorActive =
		ed &&
		!ed.removed &&
		typeof ed.getContent === 'function' &&
		!isClassicCaptionCodeViewActive(editorId);
	if (visualEditorActive) {
		return ed.getContent();
	}
	return typeof ta.value === 'string' ? ta.value : undefined;
}

/**
 * @param {import('@tanstack/react-form').ReactFormExtendedApi} form
 * @param {number}                                              storeIndex
 * @param {number}                                              attachmentId
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
 * @param {Object|null}                                         item
 * @param {import('@tanstack/react-form').ReactFormExtendedApi} form
 * @param {number}                                              storeIndex
 * @param {number}                                              attachmentId
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
 * @param {Object|null}            item
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
