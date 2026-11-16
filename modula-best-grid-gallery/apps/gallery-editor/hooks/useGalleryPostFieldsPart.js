/**
 * The gallery's title and status as the `post-fields` part of the editor save
 * session (ADR 0059, explicit-save ticket 06). Renaming and the status menu
 * change only the editor; the editor save writes them through the core REST
 * route, last for a saved gallery and first for a new one (it is saved on
 * every first save, so a new gallery leaves auto-draft with the status the
 * menu shows before any content write can promote it).
 */
import {
	useCallback,
	useEffect,
	useSyncExternalStore,
} from '@wordpress/element';
import {
	useEditorSavePart,
	useEditorSavedStateSync,
	useTakeoverSaveStatus,
} from 'editor-shell';
import { patchModulaGalleryPost } from '../api/wpRestGalleryPostApi';
import { GALLERY_SAVE_OWNERS } from '../constants/gallerySaveOwners';
import { GALLERY_SAVE_PARTS } from '../constants/gallerySaveParts';
import { useGalleryPostFields } from '../context/GalleryPostFieldsContext';

/**
 * @param {number} galleryId
 * @return {{
 *   title: string,
 *   status: string,
 *   statusLabel: string,
 *   setTitle: (title: string) => void,
 *   commitTitle: (title?: string) => void,
 *   setStatus: (status: string, label: string) => void,
 * }} The shown fields and their edits.
 */
export function useGalleryPostFieldsPart(galleryId) {
	const postFields = useGalleryPostFields();
	const { runPersistTask } = useTakeoverSaveStatus();
	const syncSavedState = useEditorSavedStateSync();
	const fields = useSyncExternalStore(
		postFields.subscribe,
		postFields.getSnapshot
	);

	// Through the write queue: the top bar's save state follows the write.
	const save = useCallback(
		() =>
			runPersistTask(
				() =>
					postFields.save(async (request) =>
						// The core REST write returns the saved-state marker for the recovery copy.
						syncSavedState(
							await patchModulaGalleryPost(galleryId, request)
						)
					),
				GALLERY_SAVE_OWNERS.postFields
			),
		[galleryId, postFields, runPersistTask, syncSavedState]
	);

	const notifyChange = useEditorSavePart({
		key: GALLERY_SAVE_PARTS.postFields,
		hasUnsavedChanges: postFields.hasUnsavedChanges,
		save,
		saveOnFirstSave: true,
		getRecoverySnapshot: postFields.getRecoverySnapshot,
		restoreRecoverySnapshot: postFields.restoreRecoverySnapshot,
	});

	useEffect(
		() => postFields.subscribe(notifyChange),
		[postFields, notifyChange]
	);

	return {
		...fields,
		setTitle: postFields.setTitle,
		commitTitle: postFields.commitTitle,
		setStatus: postFields.setStatus,
	};
}
