/**
 * Align editor form + React Query after a gallery-defaults preset is applied on the server.
 * Mirrors the post-save sync contract used by takeover autosave / type-change confirm.
 */
import { useCallback } from '@wordpress/element';
import { useQueryClient } from '@tanstack/react-query';
import {
	cloneGroupedSettings,
	serializeGroupedForServerRef,
} from '../form/useGallerySettingsForm';
import { useGallerySettingsFormBundle } from '../form/GallerySettingsFormContext';
import { normalizeGroupedDefaults } from '../logic/groupedSettingsNormalize';
import {
	getGalleryBootstrapQueryKey,
	normalizeGalleryPostId,
} from '../query/useGalleryBootstrapQuery';

/**
 * @param {Object}                                                                    args
 * @param {Record<string, Record<string, unknown>>|null|undefined}                    args.settings
 * @param {Object}                                                                    args.form
 * @param {import('react').MutableRefObject<Record<string, Record<string, unknown>>>} args.baselineRef
 * @param {import('react').MutableRefObject<string>}                                  args.lastServerSerializedRef
 * @param {{ syncCheckpointFromForm?: (values?: Record<string, Record<string, unknown>>) => void }} args.undoRedo
 * @param {import('@tanstack/react-query').QueryClient}                               args.queryClient
 * @param {number}                                                                    args.galleryId
 */
export function commitAppliedGalleryDefaultsSettings({
	settings,
	form,
	baselineRef,
	lastServerSerializedRef,
	undoRedo,
	queryClient,
	galleryId,
}) {
	if (!form || typeof form.reset !== 'function') {
		return;
	}

	const next = cloneGroupedSettings(settings);
	normalizeGroupedDefaults(next);
	form.reset(next);

	if (baselineRef) {
		baselineRef.current = next;
	}
	if (lastServerSerializedRef) {
		lastServerSerializedRef.current = serializeGroupedForServerRef(next);
	}

	const id = normalizeGalleryPostId(galleryId);
	if (queryClient && id) {
		queryClient.setQueryData(['modula', 'gallery-settings-v2', id], next);
		queryClient.setQueryData(getGalleryBootstrapQueryKey(id), (old) => {
			if (!old || typeof old !== 'object') {
				return old;
			}
			return {
				...old,
				settings: next,
			};
		});
	}

	// Pass `next` — TanStack `form.reset` can leave store.values one tick behind.
	undoRedo?.syncCheckpointFromForm?.(next);
}

/**
 * Slot helper: commit applied preset settings into the live editor session.
 *
 * @param {number} galleryId
 * @return {(settings: Record<string, Record<string, unknown>>|null|undefined) => void}
 */
export function useCommitAppliedGalleryDefaultsSettings(galleryId) {
	const { form, baselineRef, lastServerSerializedRef, undoRedo } =
		useGallerySettingsFormBundle();
	const queryClient = useQueryClient();

	return useCallback(
		(settings) => {
			commitAppliedGalleryDefaultsSettings({
				settings,
				form,
				baselineRef,
				lastServerSerializedRef,
				undoRedo,
				queryClient,
				galleryId,
			});
		},
		[
			form,
			baselineRef,
			lastServerSerializedRef,
			undoRedo,
			queryClient,
			galleryId,
		]
	);
}
