import { useCallback, useLayoutEffect, useRef, useState } from '@wordpress/element';
import { patchModulaGalleryPost } from '../api/wpRestGalleryPostApi';

/**
 * Manages takeover top-bar post title/status state and persistence.
 *
 * @param {{
 *   galleryId: number,
 *   initialTitle: string,
 *   initialStatus: string,
 *   initialStatusLabel: string,
 *   runPersistTask: (task: () => Promise<unknown>) => Promise<unknown>,
 * }} args
 */
export function useTakeoverPostMeta({
	galleryId,
	initialTitle,
	initialStatus,
	initialStatusLabel,
	runPersistTask,
}) {
	const [liveTitle, setLiveTitle] = useState(() => initialTitle || '');
	const [livePostStatus, setLivePostStatus] = useState(
		() => initialStatus || ''
	);
	const [livePostStatusLabel, setLivePostStatusLabel] = useState(
		() => initialStatusLabel || ''
	);
	const [statusBusy, setStatusBusy] = useState(false);

	const savedTitleRef = useRef(String(initialTitle || ''));
	const liveTitleRef = useRef(String(initialTitle || ''));
	const titleSaveInFlightRef = useRef(false);
	const livePostStatusRef = useRef(livePostStatus);

	useLayoutEffect(() => {
		livePostStatusRef.current = livePostStatus;
	}, [livePostStatus]);

	useLayoutEffect(() => {
		liveTitleRef.current = liveTitle;
	}, [liveTitle]);

	/**
	 * @param {string} [titleFromField]
	 */
	const commitPostTitle = useCallback(
		async (titleFromField) => {
			if (!galleryId) {
				return;
			}
			const raw =
				typeof titleFromField === 'string'
					? titleFromField
					: liveTitleRef.current;
			const trimmed = raw.trim();
			if (trimmed === '') {
				setLiveTitle(savedTitleRef.current);
				return;
			}
			if (trimmed === savedTitleRef.current.trim()) {
				return;
			}
			if (titleSaveInFlightRef.current) {
				return;
			}
			titleSaveInFlightRef.current = true;
			try {
				await runPersistTask(async () => {
					await patchModulaGalleryPost(galleryId, { title: trimmed });
				});
				savedTitleRef.current = trimmed;
				setLiveTitle(trimmed);
			} catch {
				setLiveTitle(savedTitleRef.current);
			} finally {
				titleSaveInFlightRef.current = false;
			}
		},
		[galleryId, runPersistTask]
	);

	const handlePostStatusChange = useCallback(
		async (slug, label) => {
			if (!galleryId || slug === livePostStatus) {
				return;
			}
			setStatusBusy(true);
			try {
				await runPersistTask(async () => {
					await patchModulaGalleryPost(galleryId, {
						status: slug,
					});
				});
				setLivePostStatus(slug);
				setLivePostStatusLabel(label);
			} catch {
				/* keep previous status; footer shows error from runPersistTask */
			} finally {
				setStatusBusy(false);
			}
		},
		[galleryId, livePostStatus, runPersistTask]
	);

	const applyPostStatusFromServer = useCallback((slug, label) => {
		if (!slug || slug === livePostStatusRef.current) {
			if (slug && label) {
				setLivePostStatusLabel(label);
			}
			return;
		}
		setLivePostStatus(slug);
		setLivePostStatusLabel(
			typeof label === 'string' && label ? label : slug
		);
	}, []);

	return {
		liveTitle,
		setLiveTitle,
		commitPostTitle,
		livePostStatus,
		livePostStatusLabel,
		handlePostStatusChange,
		statusBusy,
		applyPostStatusFromServer,
	};
}
