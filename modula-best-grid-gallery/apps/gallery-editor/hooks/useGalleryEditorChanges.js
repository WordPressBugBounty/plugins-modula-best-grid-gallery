/**
 * The extension point through which a Pro flow brings its result into the
 * gallery editor as unsaved changes (ADR 0059, explicit-save ticket 12):
 * built rows and attachments join the catalog, settings join the form. Each is
 * one history step; nothing is sent until the editor Save. Exposed to Pro
 * bundles as `window.modula.settingsEditorHost.useGalleryEditorChanges`.
 *
 * Call it inside the gallery editor (it reads the settings form bundle).
 *
 * @package
 */

import { useCallback, useMemo } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { useGallerySettingsFormBundle } from '../form/GallerySettingsFormContext';
import { applyGroupedSettingsAsUnsavedChange } from '../form/applyGroupedSettingsAsUnsavedChange';
import { presetSettingsForWorkingCatalog } from '../logic/presetFreeformPlacements';
import {
	addAttachmentsToPreviewCatalog,
	addBuiltItemsToPreviewCatalog,
	workingTileLayout,
} from '../utils/galleryItemRowsCommit';
import { getGalleryPreviewReduxStore } from '../utils/previewReduxStoreRef';
import { isGallerySortMode } from '../utils/gallerySortingApply';
import { setPreviewSortingMode } from '../utils/previewSortingMode';
import { resolveGalleryAdminPostId } from '../utils/resolveGalleryAdminPostId';
import { useModulaSettingsEditorConfig } from './useModulaSettingsEditorConfig';

/**
 * @typedef {{ label?: string, position?: 'start'|'end' }} GalleryItemsChangeOptions
 *
 * @typedef {{
 *   addItems: (items: Object[], options?: GalleryItemsChangeOptions) => number,
 *   addAttachments: (attachmentIds: number[], options?: GalleryItemsChangeOptions) => Promise<number>,
 *   applySettings: (settings: Record<string, Record<string, unknown>>, options: { label: string, sorting?: string, layoutSlots?: Object[] }) => number,
 * }} GalleryEditorChanges
 * - `addItems`: rows built in the browser (video rows), as stored rows; returns how many were added.
 * - `addAttachments`: Media Library attachments; the server builds their rows
 *   (`item-rows`, writes nothing); rejects when that read fails, changing nothing.
 * - `applySettings`: grouped settings onto the form; fields left out keep their values.
 *   A valid `sorting` also becomes the working sort mode (not an undo step, as
 *   choosing a mode is not). A preset's Freeform layout (`layoutSlots`) is
 *   mapped onto the working catalog, not the server's stored one; without
 *   one the working placements stay.
 * Items go to `position`, else the form's "New images go to" value.
 */

/**
 * @return {GalleryEditorChanges} Change functions bound to the open gallery.
 */
export function useGalleryEditorChanges() {
	const { form, undoRedo } = useGallerySettingsFormBundle();
	const config = useModulaSettingsEditorConfig();
	const galleryId = useMemo(
		() => resolveGalleryAdminPostId(config),
		[config]
	);

	const readTarget = useCallback(
		(options) => {
			const store = getGalleryPreviewReduxStore();
			if (!store) {
				throw new Error(
					__(
						'The gallery preview is not ready.',
						'modula-best-grid-gallery'
					)
				);
			}
			const working = form.state.values?.general?.uploadPosition;
			const position = options?.position ?? working;
			return { store, position: position === 'start' ? 'start' : 'end' };
		},
		[form]
	);

	const addItems = useCallback(
		(items, options = {}) => {
			const { store, position } = readTarget(options);
			return addBuiltItemsToPreviewCatalog({
				store,
				items: Array.isArray(items) ? items : [],
				position,
				label:
					options.label ||
					__('Add items', 'modula-best-grid-gallery'),
				commitItemsStep: undoRedo.commitItemsStep,
			});
		},
		[readTarget, undoRedo]
	);

	const addAttachments = useCallback(
		async (attachmentIds, options = {}) => {
			const { store, position } = readTarget(options);
			if (!Array.isArray(attachmentIds) || attachmentIds.length === 0) {
				return 0;
			}
			return addAttachmentsToPreviewCatalog({
				store,
				galleryId,
				attachmentIds,
				position,
				layout: workingTileLayout(form.state.values),
				commitItemsStep: undoRedo.commitItemsStep,
			});
		},
		[form, galleryId, readTarget, undoRedo]
	);

	const applySettings = useCallback(
		(settings, { label, sorting, layoutSlots }) => {
			const store = getGalleryPreviewReduxStore();
			const changed = applyGroupedSettingsAsUnsavedChange({
				form,
				undoRedo,
				settings: presetSettingsForWorkingCatalog(
					settings,
					layoutSlots,
					store?.getState().items.items ?? []
				),
				label,
			});
			// The mode only, as the stored Apply wrote it: the order is not re-sorted.
			if (store && isGallerySortMode(sorting)) {
				setPreviewSortingMode(store, sorting);
			}
			return changed;
		},
		[form, undoRedo]
	);

	return useMemo(
		() => ({ addItems, addAttachments, applySettings }),
		[addItems, addAttachments, applySettings]
	);
}
