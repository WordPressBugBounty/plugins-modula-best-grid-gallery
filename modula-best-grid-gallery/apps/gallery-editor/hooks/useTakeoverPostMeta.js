import {
	useCallback,
	useLayoutEffect,
	useRef,
	useState,
} from '@wordpress/element';
import { patchModulaGalleryPost } from '../api/wpRestGalleryPostApi';
import {
	editorConfigToPermalinkSeed,
	isAllowedEditorDocumentStatus,
} from '../utils/editorPostDocument';

/**
 * Manages takeover post title / status / slug state and persistence.
 *
 * @param {{
 *   galleryId: number,
 *   initialTitle: string,
 *   initialStatus: string,
 *   initialStatusLabel: string,
 *   initialSlug?: string,
 *   initialPermalinkPrefix?: string,
 *   initialPermalinkSuffix?: string,
 *   initialViewUrl?: string,
 *   runPersistTask: (task: () => Promise<unknown>) => Promise<unknown>,
 * }} args
 */
export function useTakeoverPostMeta({
	galleryId,
	initialTitle,
	initialStatus,
	initialStatusLabel,
	initialSlug = '',
	initialPermalinkPrefix = '',
	initialPermalinkSuffix = '',
	initialViewUrl = '',
	runPersistTask,
}) {
	const permalinkSeed = editorConfigToPermalinkSeed({
		postSlug: initialSlug,
		permalinkPrefix: initialPermalinkPrefix,
		permalinkSuffix: initialPermalinkSuffix,
		viewUrl: initialViewUrl,
	});

	const [liveTitle, setLiveTitle] = useState(() => initialTitle || '');
	const [livePostStatus, setLivePostStatus] = useState(
		() => initialStatus || ''
	);
	const [livePostStatusLabel, setLivePostStatusLabel] = useState(
		() => initialStatusLabel || ''
	);
	const [liveSlug, setLiveSlug] = useState(() => permalinkSeed.slug);
	const [permalinkPrefix] = useState(() => permalinkSeed.permalinkPrefix);
	const [permalinkSuffix] = useState(() => permalinkSeed.permalinkSuffix);
	const [viewUrl, setViewUrl] = useState(() => permalinkSeed.viewUrl);
	const [statusBusy, setStatusBusy] = useState(false);
	const [slugBusy, setSlugBusy] = useState(false);

	const savedTitleRef = useRef(String(initialTitle || ''));
	const liveTitleRef = useRef(String(initialTitle || ''));
	const titleSaveInFlightRef = useRef(false);
	const savedSlugRef = useRef(permalinkSeed.slug);
	const liveSlugRef = useRef(permalinkSeed.slug);
	const slugSaveInFlightRef = useRef(false);
	const livePostStatusRef = useRef(livePostStatus);

	useLayoutEffect(() => {
		livePostStatusRef.current = livePostStatus;
	}, [livePostStatus]);

	useLayoutEffect(() => {
		liveTitleRef.current = liveTitle;
	}, [liveTitle]);

	useLayoutEffect(() => {
		liveSlugRef.current = liveSlug;
	}, [liveSlug]);

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
			if (!isAllowedEditorDocumentStatus(slug)) {
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

	/**
	 * @param {string} [slugFromField]
	 */
	const commitPostSlug = useCallback(
		async (slugFromField) => {
			if (!galleryId) {
				return;
			}
			const raw =
				typeof slugFromField === 'string'
					? slugFromField
					: liveSlugRef.current;
			const trimmed = String(raw || '').trim();
			if (trimmed === savedSlugRef.current) {
				setLiveSlug(savedSlugRef.current);
				return;
			}
			if (slugSaveInFlightRef.current) {
				return;
			}
			slugSaveInFlightRef.current = true;
			setSlugBusy(true);
			try {
				const response = await runPersistTask(async () => {
					return patchModulaGalleryPost(galleryId, {
						slug: trimmed,
					});
				});
				const nextSlug =
					typeof response?.slug === 'string' && response.slug !== ''
						? response.slug
						: trimmed;
				const nextLink =
					typeof response?.link === 'string' ? response.link : '';
				savedSlugRef.current = nextSlug;
				setLiveSlug(nextSlug);
				if (nextLink) {
					setViewUrl(nextLink);
				}
			} catch {
				setLiveSlug(savedSlugRef.current);
			} finally {
				slugSaveInFlightRef.current = false;
				setSlugBusy(false);
			}
		},
		[galleryId, runPersistTask]
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
		liveSlug,
		setLiveSlug,
		commitPostSlug,
		slugBusy,
		permalinkPrefix,
		permalinkSuffix,
		viewUrl,
	};
}
