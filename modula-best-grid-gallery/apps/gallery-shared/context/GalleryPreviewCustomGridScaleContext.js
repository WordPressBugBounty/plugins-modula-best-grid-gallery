/**
 * Takeover live preview: custom-grid layout width scale (zoom out for editing tall grids).
 *
 * @package
 */

import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from '@wordpress/element';

const STORAGE_KEY = 'modulaTakeoverCustomGridPreviewScale';

/** @type {number} Smaller = more zoomed out (smaller cells, more rows visible). */
export const CUSTOM_GRID_PREVIEW_SCALE_MIN = 0.5;

export const CUSTOM_GRID_PREVIEW_SCALE_MAX = 1;

export const CUSTOM_GRID_PREVIEW_SCALE_STEP = 0.05;

const defaultValue = {
	scale: CUSTOM_GRID_PREVIEW_SCALE_MAX,
	setScale: () => {},
};

export const GalleryPreviewCustomGridScaleContext =
	createContext(defaultValue);

/**
 * @return {{ scale: number, setScale: (n: number | ((prev: number) => number)) => void }}
 */
export function useGalleryPreviewCustomGridScale() {
	return useContext(GalleryPreviewCustomGridScaleContext);
}

function clampScale(n) {
	if (!Number.isFinite(n)) {
		return CUSTOM_GRID_PREVIEW_SCALE_MAX;
	}
	return Math.min(
		CUSTOM_GRID_PREVIEW_SCALE_MAX,
		Math.max(CUSTOM_GRID_PREVIEW_SCALE_MIN, n)
	);
}

/**
 * @param {{ children?: * }} props
 */
export function GalleryPreviewCustomGridScaleProvider({ children }) {
	const [scale, setScaleState] = useState(CUSTOM_GRID_PREVIEW_SCALE_MAX);

	useEffect(() => {
		try {
			const raw = window.localStorage?.getItem(STORAGE_KEY);
			if (raw == null || raw === '') {
				return;
			}
			const n = parseFloat(raw);
			if (Number.isFinite(n)) {
				setScaleState(clampScale(n));
			}
		} catch {
			// ignore
		}
	}, []);

	useEffect(() => {
		try {
			window.localStorage?.setItem(STORAGE_KEY, String(scale));
		} catch {
			// ignore
		}
	}, [scale]);

	const setScale = useCallback((next) => {
		setScaleState((prev) =>
			clampScale(typeof next === 'function' ? next(prev) : next)
		);
	}, []);

	const value = useMemo(() => ({ scale, setScale }), [scale, setScale]);

	return (
		<GalleryPreviewCustomGridScaleContext.Provider value={value}>
			{children}
		</GalleryPreviewCustomGridScaleContext.Provider>
	);
}
