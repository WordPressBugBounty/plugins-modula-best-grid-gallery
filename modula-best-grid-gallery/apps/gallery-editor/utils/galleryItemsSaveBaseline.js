/**
 * What the gallery items part of the editor save session compares and sends
 * (ADR 0059): the catalog as the items endpoint stores it, and the sort mode.
 * The baseline is the last stored state; anything else is an unsaved change.
 *
 * @package
 */
import { previewCoreItemsToSaveMergedPayload } from './embeddedGalleryItems';

/**
 * @typedef {Object} GalleryItemsSnapshot
 * @property {Object[]} items       Catalog rows as `save-merged-items` takes them.
 * @property {string}   itemsKey    Serialized `items`, for comparison.
 * @property {string}   sortingMode The gallery's sort mode (`modulaSorting`).
 */

/**
 * @param {Object[]} catalog     Preview catalog (gallery items, display order).
 * @param {string}   sortingMode Sort mode.
 * @return {GalleryItemsSnapshot} The state an items save would store.
 */
export function galleryItemsSnapshot(catalog, sortingMode) {
	const items = previewCoreItemsToSaveMergedPayload(catalog);
	return { items, itemsKey: JSON.stringify(items), sortingMode };
}

/**
 * The last stored items state. Before `adopt` there is nothing to compare,
 * so nothing is unsaved.
 */
export function createGalleryItemsSaveBaseline() {
	/** @type {{ itemsKey: string, sortingMode: string }|null} */
	let stored = null;

	/**
	 * @param {GalleryItemsSnapshot} snapshot
	 * @return {{ items: boolean, sortingMode: boolean }} Which writes the snapshot needs.
	 */
	const unsavedChanges = (snapshot) => ({
		items: stored !== null && snapshot.itemsKey !== stored.itemsKey,
		sortingMode:
			stored !== null && snapshot.sortingMode !== stored.sortingMode,
	});

	return {
		unsavedChanges,
		/**
		 * @param {GalleryItemsSnapshot} snapshot
		 * @return {boolean} The snapshot differs from the stored state.
		 */
		hasUnsavedChanges(snapshot) {
			const changes = unsavedChanges(snapshot);
			return changes.items || changes.sortingMode;
		},
		/** @param {GalleryItemsSnapshot} snapshot Now stored, in full. */
		adopt(snapshot) {
			stored = {
				itemsKey: snapshot.itemsKey,
				sortingMode: snapshot.sortingMode,
			};
		},
		/** @param {GalleryItemsSnapshot} snapshot Its catalog is now stored. */
		adoptItems(snapshot) {
			stored = { ...stored, itemsKey: snapshot.itemsKey };
		},
		/** @param {GalleryItemsSnapshot} snapshot Its sort mode is now stored. */
		adoptSortingMode(snapshot) {
			stored = { ...stored, sortingMode: snapshot.sortingMode };
		},
	};
}

/**
 * Store what `snapshot` changes against the baseline: the catalog first, then
 * the sort mode. Each write that succeeds becomes the baseline at once, so a
 * failure leaves only what is still unsaved for Retry.
 *
 * @param {{
 *   snapshot: GalleryItemsSnapshot,
 *   baseline: ReturnType<typeof createGalleryItemsSaveBaseline>,
 *   writeItems: (items: Object[]) => Promise<unknown>,
 *   writeSortingMode: (sortingMode: string) => Promise<unknown>,
 * }} args
 * @return {Promise<void>} Rejects with the failed write's error.
 */
export async function saveGalleryItemsChanges({
	snapshot,
	baseline,
	writeItems,
	writeSortingMode,
}) {
	const changes = baseline.unsavedChanges(snapshot);
	if (changes.items) {
		await writeItems(snapshot.items);
		baseline.adoptItems(snapshot);
	}
	if (changes.sortingMode) {
		await writeSortingMode(snapshot.sortingMode);
		baseline.adoptSortingMode(snapshot);
	}
}
