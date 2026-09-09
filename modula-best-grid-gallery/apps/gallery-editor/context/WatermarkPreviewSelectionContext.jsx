/**
 * Session selection of preview tiles for watermark “Selected only” apply scope.
 */

import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from '@wordpress/element';
import { useGallerySettingsFormBundle } from '../form/GallerySettingsFormContext';
import { usePreviewReduxStoreItems } from '../hooks/usePreviewReduxStoreItems';
import { useGalleryPreviewTileSelection } from './GalleryPreviewTileSelectionContext';

/** @type {import('react').Context<{
 *   active: boolean,
 *   selectedIds: number[],
 *   isSelected: (id: number) => boolean,
 *   toggle: (id: number) => void,
 *   clear: () => void,
 * } | null>} */
export const WatermarkPreviewSelectionContext = createContext(null);

/**
 * @return {{
 *   active: boolean,
 *   selectedIds: number[],
 *   isSelected: (id: number) => boolean,
 *   toggle: (id: number) => void,
 *   clear: () => void,
 * } | null}
 */
export function useWatermarkPreviewSelection() {
	return useContext(WatermarkPreviewSelectionContext);
}

/**
 * @param {{ children: import('react').ReactNode }} props
 */
export function WatermarkPreviewSelectionProvider({ children }) {
	const { form } = useGallerySettingsFormBundle();
	const [scope, setScope] = useState(
		() => form.state.values?.watermark?.watermarkApplyScope || 'all'
	);
	const [watermarkType, setWatermarkType] = useState(
		() => form.state.values?.watermark?.watermarkType || 'none'
	);

	useEffect(() => {
		const unsub = form.store.subscribe(() => {
			const values = form.store.state.values;
			setScope(values?.watermark?.watermarkApplyScope || 'all');
			setWatermarkType(values?.watermark?.watermarkType || 'none');
		});
		return unsub;
	}, [form.store]);

	// Watermark “Selected only” should reuse the canvas multi-select.
	// This prevents a second, watermark-specific selection flow.
	const tileSelection = useGalleryPreviewTileSelection();
	const selectedStoreIndices = tileSelection?.selectedStoreIndices ?? [];
	const hasCanvasSelection = tileSelection?.hasSelection === true;

	const previewItems = usePreviewReduxStoreItems(
		scope === 'selected' && watermarkType !== 'none' && hasCanvasSelection
	);

	const selectedIds = useMemo(() => {
		if (scope !== 'selected' || watermarkType === 'none') {
			return [];
		}
		if (!hasCanvasSelection || selectedStoreIndices.length === 0) {
			return [];
		}
		if (!Array.isArray(previewItems) || previewItems.length === 0) {
			return [];
		}

		const ids = [];
		const seen = new Set();
		for (const idx of selectedStoreIndices) {
			const n = Number(idx);
			if (!Number.isFinite(n) || n < 0) {
				continue;
			}
			const row = previewItems[n];
			const id = Number(row?.id);
			if (!Number.isFinite(id) || id <= 0 || seen.has(id)) {
				continue;
			}
			seen.add(id);
			ids.push(id);
		}
		return ids;
	}, [
		scope,
		watermarkType,
		hasCanvasSelection,
		selectedStoreIndices,
		previewItems,
	]);

	const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

	// Keep watermark selection UI disabled; selection comes from canvas.
	const active = false;

	const toggle = useCallback(() => {
		// No-op: “Selected only” is driven by canvas selection (Select multiple).
	}, []);

	const clear = useCallback(() => {
		// No-op: “Selected only” is driven by canvas selection (Select multiple).
	}, []);

	const isSelected = useCallback(
		(id) => {
			const n = Number(id);
			return Number.isFinite(n) && selectedSet.has(n);
		},
		[selectedSet]
	);

	const value = useMemo(
		() => ({
			active,
			selectedIds,
			isSelected,
			toggle,
			clear,
		}),
		[active, selectedIds, isSelected, toggle, clear]
	);

	return (
		<WatermarkPreviewSelectionContext.Provider value={value}>
			{children}
		</WatermarkPreviewSelectionContext.Provider>
	);
}
