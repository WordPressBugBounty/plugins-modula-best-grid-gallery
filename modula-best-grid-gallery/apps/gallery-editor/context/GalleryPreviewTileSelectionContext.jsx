/**
 * Multi-select of preview gallery image tiles (toolbar Select multiple / Select all).
 * Does not open or change the Image edit sidebar.
 */
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from '@wordpress/element';
import { getGalleryItemEditKind } from '../utils/galleryItemEditNavigation';
import { getGalleryPreviewReduxStore } from '../utils/previewReduxStoreRef';

/**
 * @param {Object[]|undefined|null} reduxItems
 * @return {number[]}
 */
export function getSelectableImageStoreIndices(reduxItems) {
	if (!Array.isArray(reduxItems)) {
		return [];
	}
	const out = [];
	for (let i = 0; i < reduxItems.length; i++) {
		if (getGalleryItemEditKind(reduxItems[i]) === 'image') {
			out.push(i);
		}
	}
	return out;
}

/**
 * Inclusive range between two store indices within the selectable image list.
 *
 * @param {number[]} selectable
 * @param {number} fromIdx
 * @param {number} toIdx
 * @return {number[]}
 */
export function getSelectableRangeIndices(selectable, fromIdx, toIdx) {
	const a = selectable.indexOf(fromIdx);
	const b = selectable.indexOf(toIdx);
	if (a < 0 || b < 0) {
		return Number.isFinite(toIdx) && toIdx >= 0 ? [toIdx] : [];
	}
	const lo = Math.min(a, b);
	const hi = Math.max(a, b);
	return selectable.slice(lo, hi + 1);
}

/** @type {import('react').Context<{
 *   selectedStoreIndices: number[],
 *   modeActive: boolean,
 *   hasSelection: boolean,
 *   allSelected: boolean,
 *   isSelected: (storeIndex: number) => boolean,
 *   enterMode: () => void,
 *   exitMode: () => void,
 *   toggleMode: () => void,
 *   toggle: (storeIndex: number) => void,
 *   selectSingle: (storeIndex: number) => void,
 *   selectRange: (storeIndex: number, anchorOverride?: number | null) => void,
 *   handleTileClick: (storeIndex: number, options?: { shiftKey?: boolean, anchorOverride?: number | null }) => void,
 *   selectAll: () => void,
 *   clear: () => void,
 *   toggleSelectAll: () => void,
 * } | null>} */
export const GalleryPreviewTileSelectionContext = createContext(null);

/**
 * @return {{
 *   selectedStoreIndices: number[],
 *   modeActive: boolean,
 *   hasSelection: boolean,
 *   allSelected: boolean,
 *   isSelected: (storeIndex: number) => boolean,
 *   enterMode: () => void,
 *   exitMode: () => void,
 *   toggleMode: () => void,
 *   toggle: (storeIndex: number) => void,
 *   selectSingle: (storeIndex: number) => void,
 *   selectRange: (storeIndex: number, anchorOverride?: number | null) => void,
 *   handleTileClick: (storeIndex: number, options?: { shiftKey?: boolean, anchorOverride?: number | null }) => void,
 *   selectAll: () => void,
 *   clear: () => void,
 *   toggleSelectAll: () => void,
 * } | null}
 */
export function useGalleryPreviewTileSelection() {
	return useContext(GalleryPreviewTileSelectionContext);
}

/**
 * @param {{ children: import('react').ReactNode }} props
 */
export function GalleryPreviewTileSelectionProvider({ children }) {
	const [selectedStoreIndices, setSelectedStoreIndices] = useState(
		/** @type {number[]} */ ([])
	);
	const [modeActive, setModeActive] = useState(false);
	const [anchorStoreIndex, setAnchorStoreIndex] = useState(
		/** @type {number | null} */ (null)
	);

	const getSelectableIndices = useCallback(() => {
		const store = getGalleryPreviewReduxStore();
		const items = store?.getState?.().items?.items;
		return getSelectableImageStoreIndices(items);
	}, []);

	const clear = useCallback(() => {
		setSelectedStoreIndices([]);
		setAnchorStoreIndex(null);
	}, []);

	const enterMode = useCallback(() => {
		setModeActive(true);
	}, []);

	const exitMode = useCallback(() => {
		setModeActive(false);
		setSelectedStoreIndices([]);
		setAnchorStoreIndex(null);
	}, []);

	const toggleMode = useCallback(() => {
		setModeActive((prev) => {
			if (prev) {
				setSelectedStoreIndices([]);
				setAnchorStoreIndex(null);
				return false;
			}
			return true;
		});
	}, []);

	const selectSingle = useCallback((storeIndex) => {
		const n = Number(storeIndex);
		if (!Number.isFinite(n) || n < 0) {
			return;
		}
		setSelectedStoreIndices([n]);
		setAnchorStoreIndex(n);
	}, []);

	const toggle = useCallback((storeIndex) => {
		const n = Number(storeIndex);
		if (!Number.isFinite(n) || n < 0) {
			return;
		}
		setSelectedStoreIndices((prev) => {
			if (prev.includes(n)) {
				return prev.filter((x) => x !== n);
			}
			return [...prev, n];
		});
		setAnchorStoreIndex(n);
	}, []);

	const selectRange = useCallback(
		(storeIndex, anchorOverride = undefined) => {
			const n = Number(storeIndex);
			if (!Number.isFinite(n) || n < 0) {
				return;
			}
			const selectable = getSelectableIndices();
			const resolvedAnchor =
				anchorOverride !== undefined && anchorOverride !== null
					? Number(anchorOverride)
					: anchorStoreIndex;
			const anchor =
				resolvedAnchor !== null &&
				Number.isFinite(resolvedAnchor) &&
				selectable.includes(resolvedAnchor)
					? resolvedAnchor
					: n;
			const range = getSelectableRangeIndices(selectable, anchor, n);
			setSelectedStoreIndices(range);
			setAnchorStoreIndex(anchor);
		},
		[anchorStoreIndex, getSelectableIndices]
	);

	const handleTileClick = useCallback(
		(storeIndex, options = {}) => {
			if (options.shiftKey) {
				const anchor =
					options.anchorOverride !== undefined &&
					options.anchorOverride !== null
						? options.anchorOverride
						: anchorStoreIndex;
				if (anchor !== null && anchor !== undefined) {
					if (!modeActive) {
						enterMode();
					}
					selectRange(storeIndex, anchor);
					return;
				}
				if (!modeActive) {
					enterMode();
				}
				selectSingle(storeIndex);
				return;
			}

			if (!modeActive) {
				return;
			}
			toggle(storeIndex);
		},
		[
			modeActive,
			anchorStoreIndex,
			enterMode,
			selectRange,
			selectSingle,
			toggle,
		]
	);

	const selectAll = useCallback(() => {
		const selectable = getSelectableIndices();
		setModeActive(true);
		setSelectedStoreIndices(selectable);
		setAnchorStoreIndex(selectable.length > 0 ? selectable[0] : null);
	}, [getSelectableIndices]);

	const toggleSelectAll = useCallback(() => {
		const selectable = getSelectableIndices();
		if (selectable.length === 0) {
			setSelectedStoreIndices([]);
			setAnchorStoreIndex(null);
			return;
		}
		setModeActive(true);
		setSelectedStoreIndices((prev) => {
			const allOn =
				selectable.length > 0 &&
				selectable.every((idx) => prev.includes(idx));
			if (allOn) {
				setAnchorStoreIndex(null);
				return [];
			}
			setAnchorStoreIndex(selectable[0] ?? null);
			return selectable;
		});
	}, [getSelectableIndices]);

	const isSelected = useCallback(
		(storeIndex) => {
			const n = Number(storeIndex);
			return Number.isFinite(n) && selectedStoreIndices.includes(n);
		},
		[selectedStoreIndices]
	);

	const hasSelection = selectedStoreIndices.length > 0;

	const allSelected = useMemo(() => {
		const selectable = getSelectableIndices();
		return (
			selectable.length > 0 &&
			selectable.every((idx) => selectedStoreIndices.includes(idx))
		);
	}, [getSelectableIndices, selectedStoreIndices]);

	useEffect(() => {
		if (!modeActive) {
			return undefined;
		}
		const onKey = (e) => {
			if (e.key !== 'Escape') {
				return;
			}
			e.preventDefault();
			e.stopPropagation();
			exitMode();
		};
		window.addEventListener('keydown', onKey, true);
		return () => window.removeEventListener('keydown', onKey, true);
	}, [modeActive, exitMode]);

	const value = useMemo(
		() => ({
			selectedStoreIndices,
			modeActive,
			hasSelection,
			allSelected,
			isSelected,
			enterMode,
			exitMode,
			toggleMode,
			toggle,
			selectSingle,
			selectRange,
			handleTileClick,
			selectAll,
			clear,
			toggleSelectAll,
		}),
		[
			selectedStoreIndices,
			modeActive,
			hasSelection,
			allSelected,
			isSelected,
			enterMode,
			exitMode,
			toggleMode,
			toggle,
			selectSingle,
			selectRange,
			handleTileClick,
			selectAll,
			clear,
			toggleSelectAll,
		]
	);

	return (
		<GalleryPreviewTileSelectionContext.Provider value={value}>
			{children}
		</GalleryPreviewTileSelectionContext.Provider>
	);
}
