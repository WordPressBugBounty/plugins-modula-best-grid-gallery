import {
	asGalleryItemList,
} from 'gallery-shared/preview';
import { useLayoutEffect, useRef } from '@wordpress/element';
import { setGalleryPreviewReduxStore } from '../../utils/previewReduxStoreRef';
import {
	applyPreviewViewportToGalleryStore,
	cloneBootstrapItemsForPreviewStore,
	createTakeoverLivePreviewReduxStore,
	hydrateTakeoverLivePreviewStore,
} from '../../utils/takeoverLivePreviewBootstrap';
import { previewItemsLayoutFingerprint } from '../../utils/previewItemsLayoutFingerprint';

/**
 * One Redux store per gallery; preview viewport only updates gallery config (items are shared).
 *
 * @param {{
 *   galleryId: number,
 *   bootstrap: object,
 *   groupedSettings: object,
 *   previewViewport: 'desktop'|'tablet'|'mobile',
 *   galleryTitle?: string,
 *   shouldPreservePreviewItemsRef?: import('react').MutableRefObject<() => boolean>,
 * }} args
 */
export function useTakeoverPreviewStore({
	galleryId,
	bootstrap,
	groupedSettings,
	previewViewport,
	galleryTitle,
	shouldPreservePreviewItemsRef,
}) {
	const storeRef = useRef(null);
	const previewStoreKeyRef = useRef('');
	const bootstrapItemsFingerprintRef = useRef(
		/** @type {string|null} */ (null)
	);

	const previewStoreKey = String(galleryId);
	if (
		storeRef.current === null ||
		previewStoreKeyRef.current !== previewStoreKey
	) {
		previewStoreKeyRef.current = previewStoreKey;
		bootstrapItemsFingerprintRef.current = null;
		storeRef.current = createTakeoverLivePreviewReduxStore({
			bootstrap,
			groupedSettings,
			previewViewport,
			galleryTitle,
		});
	}
	const store = storeRef.current;

	useLayoutEffect(() => {
		applyPreviewViewportToGalleryStore(
			store,
			groupedSettings,
			previewViewport
		);
	}, [store, groupedSettings, previewViewport]);

	useLayoutEffect(() => {
		const bootstrapCore = asGalleryItemList(
			Array.isArray(bootstrap?.items)
				? cloneBootstrapItemsForPreviewStore(bootstrap.items)
				: []
		);
		const bootstrapFingerprint =
			previewItemsLayoutFingerprint(bootstrapCore);
		const prevBootstrapFingerprint = bootstrapItemsFingerprintRef.current;
		const bootstrapItemsChanged =
			prevBootstrapFingerprint === null ||
			prevBootstrapFingerprint !== bootstrapFingerprint;
		bootstrapItemsFingerprintRef.current = bootstrapFingerprint;

		const storeCore = asGalleryItemList(
			store.getState()?.items?.items ?? []
		);
		const storeFingerprint = previewItemsLayoutFingerprint(storeCore);
		const storeAlreadyMatchesBootstrap =
			storeFingerprint !== '' &&
			storeFingerprint === bootstrapFingerprint;

		const preserveItems =
			storeAlreadyMatchesBootstrap ||
			(typeof shouldPreservePreviewItemsRef?.current === 'function' &&
				shouldPreservePreviewItemsRef.current()) ||
			!bootstrapItemsChanged;
		hydrateTakeoverLivePreviewStore(store, {
			bootstrap,
			groupedSettings,
			previewViewport,
			galleryTitle,
			preserveItems,
		});
	}, [
		store,
		bootstrap,
		groupedSettings,
		previewViewport,
		galleryTitle,
		shouldPreservePreviewItemsRef,
	]);

	useLayoutEffect(() => {
		setGalleryPreviewReduxStore(store);
		return () => {
			setGalleryPreviewReduxStore(null);
		};
	}, [store]);

	return { store, storeRef };
}
