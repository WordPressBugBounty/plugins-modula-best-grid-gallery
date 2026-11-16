import { asGalleryItemList } from 'gallery-shared/preview';
import { useLayoutEffect, useRef } from '@wordpress/element';
import { setGalleryPreviewReduxStore } from '../../utils/previewReduxStoreRef';
import {
	applyPreviewSettingsToGalleryStore,
	cloneBootstrapItemsForPreviewStore,
	createTakeoverLivePreviewReduxStore,
	hydrateTakeoverLivePreviewItems,
} from '../../utils/takeoverLivePreviewBootstrap';
import { previewItemsLayoutFingerprint } from '../../utils/previewItemsLayoutFingerprint';

/**
 * The items part's view of the stored catalog, for hydration.
 *
 * @typedef {Object} PreviewItemsBaseline
 * @property {() => boolean} hasUnsavedChanges The store has unsaved item changes.
 * @property {() => void}    adoptStoredItems  The store's catalog is the stored one.
 */

/**
 * One Redux store per gallery: the editor's working catalog (ADR 0059).
 * Settings, viewport and title follow the form. The catalog hydrates on open
 * and when the bootstrap's catalog is fetched again (writes that still store
 * items on their own refetch it); a fetched catalog never replaces unsaved
 * items. An editor save does not touch the bootstrap, so it never re-hydrates
 * the store.
 *
 * @param {{
 *   galleryId: number,
 *   bootstrap: object,
 *   groupedSettings: object,
 *   previewViewport: 'desktop'|'tablet'|'mobile',
 *   galleryTitle?: string,
 *   itemsBaselineRef: import('react').MutableRefObject<PreviewItemsBaseline>,
 * }} args
 */
export function useTakeoverPreviewStore({
	galleryId,
	bootstrap,
	groupedSettings,
	previewViewport,
	galleryTitle,
	itemsBaselineRef,
}) {
	const storeRef = useRef(null);
	const previewStoreKeyRef = useRef('');

	const previewStoreKey = String(galleryId);
	if (
		storeRef.current === null ||
		previewStoreKeyRef.current !== previewStoreKey
	) {
		previewStoreKeyRef.current = previewStoreKey;
		storeRef.current = createTakeoverLivePreviewReduxStore({
			bootstrap,
			groupedSettings,
			previewViewport,
			galleryTitle,
		});
	}
	const store = storeRef.current;

	useLayoutEffect(() => {
		applyPreviewSettingsToGalleryStore(store, {
			groupedSettings,
			previewViewport,
			galleryTitle,
		});
	}, [store, groupedSettings, previewViewport, galleryTitle]);

	const bootstrapItems = bootstrap?.items;
	useLayoutEffect(() => {
		if (itemsBaselineRef.current.hasUnsavedChanges()) {
			return;
		}
		const storeFingerprint = previewItemsLayoutFingerprint(
			asGalleryItemList(store.getState()?.items?.items ?? [])
		);
		const bootstrapFingerprint = previewItemsLayoutFingerprint(
			asGalleryItemList(
				cloneBootstrapItemsForPreviewStore(
					Array.isArray(bootstrapItems) ? bootstrapItems : []
				)
			)
		);
		if (storeFingerprint === bootstrapFingerprint) {
			return;
		}
		if (hydrateTakeoverLivePreviewItems(store, bootstrapItems)) {
			itemsBaselineRef.current.adoptStoredItems();
		}
	}, [store, bootstrapItems, itemsBaselineRef]);

	useLayoutEffect(() => {
		setGalleryPreviewReduxStore(store);
		return () => {
			setGalleryPreviewReduxStore(null);
		};
	}, [store]);

	return { store, storeRef };
}
