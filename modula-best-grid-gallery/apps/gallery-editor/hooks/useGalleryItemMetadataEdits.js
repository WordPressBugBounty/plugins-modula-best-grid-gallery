/**
 * Image panel metadata edits (title, alt, caption, link, filters, hover,
 * CSS class, video and EXIF fields) go into the preview store as they are
 * made, so the canvas shows them at once. They are unsaved changes of the
 * gallery's items until the editor save stores the catalog, which also writes
 * the attachment's title, alt and caption (ADR 0059). Nothing is sent here.
 *
 * Uses the preview Redux store ref: the panel mounts outside the preview
 * `<Provider>`.
 */
import {
	asGalleryItemList,
	commitPreviewCatalog,
	storeIndexToCoreIndex,
} from 'gallery-shared/preview';
import { useCallback, useEffect, useRef } from '@wordpress/element';
import { parseFiltersField } from '../components/bulk-edit/bulkEditUtils';
import { mergeTagsIntoGalleryFilterSettings } from '../components/bulk-edit/bulkEditSave';
import { useGallerySettingsFormBundle } from '../form/GallerySettingsFormContext';
import { resolveProGateLock } from '../logic/proGateLock';
import { useModulaSettingsEditorConfig } from './useModulaSettingsEditorConfig';
import { collectImageMetadataEditValues } from '../utils/galleryItemEditDirtyState';
import { applyImageMetadataEditToCatalog } from '../utils/galleryItemMetadataEdit';
import { getGalleryPreviewReduxStore } from '../utils/previewReduxStoreRef';

/**
 * @param {{
 *   storeIndex: number,
 *   attachmentId: number,
 *   form: import('@tanstack/react-form').ReactFormExtendedApi<any>,
 *   enabled?: boolean,
 * }} args
 * @return {{
 *   flush: () => Promise<void>,
 *   filtersGate: { allowed: boolean },
 *   videoGate: { allowed: boolean },
 *   exifGate: { allowed: boolean },
 * }} `flush` applies what the store does not have yet (the caption editor's live text).
 */
export function useGalleryItemMetadataEdits({
	storeIndex,
	attachmentId,
	form,
	enabled = true,
}) {
	const { form: gallerySettingsForm } = useGallerySettingsFormBundle();
	const editor = useModulaSettingsEditorConfig();

	const videoGate = resolveProGateLock(
		{ kind: 'requiresExtension', extensionSlug: 'modula-video' },
		editor
	);
	const exifGate = resolveProGateLock(
		{ kind: 'requiresExtension', extensionSlug: 'modula-exif' },
		editor
	);
	const filtersGate = resolveProGateLock({ kind: 'requiresPro' }, editor);

	const argsRef = useRef(null);
	argsRef.current = {
		storeIndex,
		attachmentId,
		form,
		enabled,
		gallerySettingsForm,
		groups: {
			filters: filtersGate.allowed,
			video: videoGate.allowed,
			exif:
				exifGate.allowed &&
				Boolean(gallerySettingsForm.state.values?.exif?.enableExif),
		},
	};

	const applyEdits = useCallback(() => {
		const args = argsRef.current;
		const store = getGalleryPreviewReduxStore();
		// Only the author's edits count: opening the panel and the Media
		// Library hydration reset the form and must not leave unsaved changes.
		if (!args.enabled || !store || !args.form.state.isDirty) {
			return;
		}
		const items = store.getState().items.items;
		const coreIndex = storeIndexToCoreIndex(items, args.storeIndex);
		if (coreIndex < 0) {
			return;
		}
		const catalog = asGalleryItemList(items);
		const next = applyImageMetadataEditToCatalog(
			catalog,
			coreIndex,
			collectImageMetadataEditValues(
				args.form,
				args.storeIndex,
				args.attachmentId
			),
			args.groups
		);
		if (next === catalog) {
			return;
		}
		if (next[coreIndex].filters !== catalog[coreIndex].filters) {
			mergeTagsIntoGalleryFilterSettings(
				args.gallerySettingsForm,
				parseFiltersField(next[coreIndex].filters)
			);
		}
		commitPreviewCatalog(store, next);
	}, []);

	useEffect(() => {
		if (!enabled) {
			return undefined;
		}
		return form.store.subscribe(applyEdits);
	}, [enabled, form.store, applyEdits]);

	const flush = useCallback(() => {
		applyEdits();
		return Promise.resolve();
	}, [applyEdits]);

	return { flush, filtersGate, videoGate, exifGate };
}
