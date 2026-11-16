/**
 * The extension point for an action that writes the gallery at once from
 * inside the gallery editor (ADR 0059, explicit-save ticket 12, decisions 25
 * and 26): Pro's Instagram import and content galleries. Exposed to Pro
 * bundles as `window.modula.settingsEditorHost.useImmediateGalleryAction`.
 *
 * - `run(action)` starts the action at once when nothing is unsaved and the
 *   gallery was saved before. With unsaved changes, or on a never-saved
 *   gallery, it holds the action and `notice` asks to save first; its "Save
 *   and continue" runs the editor Save (the first save of a new gallery, even
 *   without edits) and starts the action only when the save ends Saved. The
 *   editor never saves on its own before an action.
 * - After the action's write, `adoptStoredGallery()` refetches the bootstrap
 *   (the catalog hydrates, as nothing is unsaved) and takes its saved-state
 *   marker, so the editor reads saved and a later recovery copy is not
 *   "saved elsewhere".
 *
 * Call it inside the editor save session (the gallery editor's canvas).
 *
 * @package
 */

import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Notice } from 'admin-ui';
import { useEditorSaveSession, useEditorSavedStateSync } from 'editor-shell';
import {
	fetchGalleryBootstrapPayload,
	getGalleryBootstrapQueryKey,
} from '../query/useGalleryBootstrapQuery';

/**
 * @typedef {Object} ImmediateGalleryAction
 * @property {(action: () => unknown) => void} run                Start `action` now, or after "Save and continue" when something is unsaved.
 * @property {import('react').ReactNode}       notice             The save-first offer while an action waits; render it in the dialog.
 * @property {() => Promise<void>}             adoptStoredGallery After the action's write: show the stored gallery as saved state. Rejects when the bootstrap request fails.
 */

/**
 * An immediate write needs the gallery stored as the editor shows it: no
 * unsaved changes, and not a never-saved auto-draft (decision 11: a new
 * gallery stays an auto-draft until its first editor save).
 *
 * @param {ReturnType<typeof useEditorSaveSession>} session
 * @return {boolean} Whether the action has to wait for "Save and continue".
 */
function needsSaveFirst(session) {
	return Boolean(session?.hasUnsavedChanges || session?.isNeverSaved());
}

/**
 * @param {number} galleryId The open gallery.
 * @return {ImmediateGalleryAction} Bound to the open editor.
 */
export function useImmediateGalleryAction(galleryId) {
	const session = useEditorSaveSession();
	const sessionRef = useRef(session);
	// The latest session for the save-and-continue callback, kept out of render.
	useLayoutEffect(() => {
		sessionRef.current = session;
	}, [session]);
	const syncSavedState = useEditorSavedStateSync();
	const queryClient = useQueryClient();
	const [waiting, setWaiting] = useState(null);
	const [saving, setSaving] = useState(false);
	const mountedRef = useRef(true);
	useEffect(() => {
		mountedRef.current = true;
		return () => {
			mountedRef.current = false;
		};
	}, []);

	const run = useCallback((action) => {
		if (!needsSaveFirst(sessionRef.current)) {
			action();
			return;
		}
		setWaiting({ action });
	}, []);

	const saveAndContinue = useCallback(async () => {
		if (!waiting || saving) {
			return;
		}
		setSaving(true);
		const status = await sessionRef.current.ensureSaved();
		// A dialog closed during the save drops its action.
		if (!mountedRef.current) {
			return;
		}
		setSaving(false);
		// Unsaved (an edit made during the save), error or still never saved: the offer stays.
		if (status !== 'saved' || sessionRef.current.isNeverSaved()) {
			return;
		}
		setWaiting(null);
		waiting.action();
	}, [waiting, saving]);

	const cancel = useCallback(() => setWaiting(null), []);

	const adoptStoredGallery = useCallback(async () => {
		const stored = await queryClient.fetchQuery({
			queryKey: getGalleryBootstrapQueryKey(galleryId),
			queryFn: () => fetchGalleryBootstrapPayload(galleryId),
			staleTime: 0,
		});
		// The action started with nothing unsaved; an edit made since keeps the older base.
		if (!sessionRef.current?.hasUnsavedChanges) {
			syncSavedState(stored);
		}
	}, [galleryId, queryClient, syncSavedState]);

	const saveError =
		waiting && session?.status === 'error' ? session.errorMessage : '';
	const notice = waiting ? (
		<Notice tone="warning" role="alert">
			<p>
				{__(
					'This writes to the gallery at once. Save the gallery first.',
					'modula-best-grid-gallery'
				)}
			</p>
			{saveError ? <p>{saveError}</p> : null}
			<Button
				variant="primary"
				onClick={saveAndContinue}
				disabled={saving}
				aria-busy={saving || undefined}
			>
				{__('Save and continue', 'modula-best-grid-gallery')}
			</Button>
			<Button variant="secondary" onClick={cancel} disabled={saving}>
				{__('Cancel', 'modula-best-grid-gallery')}
			</Button>
		</Notice>
	) : null;

	return { run, notice, adoptStoredGallery };
}
