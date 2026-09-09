/**
 * Settings-editor: which gallery item is open in the Image sidebar panel.
 */
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from '@wordpress/element';
import { useTakeoverSidebarStack } from './TakeoverSidebarStackContext';
import { useGalleryPreviewTileSelection } from './GalleryPreviewTileSelectionContext';
import { useGalleryReorderSidebar } from './GalleryReorderSidebarContext';

/** @typedef {'edit'|'focus'} GalleryItemEditView */

/** @type {import('react').Context<{
 *   storeIndex: number | null,
 *   view: GalleryItemEditView,
 *   open: (storeIndex: number) => void,
 *   openFocus: (storeIndex: number) => void,
 *   closeFocus: () => void,
 *   close: () => void,
 *   isOpen: boolean,
 * } | null>} */
export const GalleryItemEditSidebarContext = createContext(null);

/**
 * Clear keyboard focus on preview tile select-hit so Escape does not leave a
 * focus ring that looks like selection.
 */
function blurPreviewItemSelectHit() {
	if (typeof document === 'undefined') {
		return;
	}
	const active = document.activeElement;
	if (!(active instanceof HTMLElement)) {
		return;
	}
	if (
		active.classList.contains(
			'modula-gallery-preview-item-admin__select-hit'
		) ||
		active.closest('.modula-gallery-preview-item-admin')
	) {
		active.blur();
	}
}

/**
 * @return {{
 *   storeIndex: number | null,
 *   view: GalleryItemEditView,
 *   open: (storeIndex: number) => void,
 *   openFocus: (storeIndex: number) => void,
 *   closeFocus: () => void,
 *   close: () => void,
 *   isOpen: boolean,
 * } | null}
 */
export function useGalleryItemEditSidebar() {
	return useContext(GalleryItemEditSidebarContext);
}

/**
 * @param {{ children: import('react').ReactNode }} props
 */
export function GalleryItemEditSidebarProvider({ children }) {
	const { clearStack } = useTakeoverSidebarStack();
	const tileSelection = useGalleryPreviewTileSelection();
	const reorderSidebar = useGalleryReorderSidebar();
	const [storeIndex, setStoreIndex] = useState(
		/** @type {number | null} */ (null)
	);
	const [view, setView] = useState(
		/** @type {GalleryItemEditView} */ ('edit')
	);

	const open = useCallback(
		(idx) => {
			const n = Number(idx);
			if (!Number.isFinite(n) || n < 0) {
				return;
			}
			reorderSidebar?.close();
			clearStack();
			setView('edit');
			setStoreIndex(n);
		},
		[clearStack, reorderSidebar]
	);

	const openFocus = useCallback(
		(idx) => {
			const n = Number(idx);
			if (!Number.isFinite(n) || n < 0) {
				return;
			}
			reorderSidebar?.close();
			clearStack();
			setStoreIndex(n);
			setView('focus');
		},
		[clearStack, reorderSidebar]
	);

	const closeFocus = useCallback(() => {
		setView('edit');
	}, []);

	const close = useCallback(() => {
		setStoreIndex(null);
		setView('edit');
		blurPreviewItemSelectHit();
	}, []);

	/*
	 * Multi-select mode replaces the Image edit form:
	 * close the sidebar so the previous category tab shows again.
	 */
	useEffect(() => {
		if (!tileSelection?.modeActive || storeIndex === null) {
			return;
		}
		close();
	}, [tileSelection?.modeActive, storeIndex, close]);

	useEffect(() => {
		if (storeIndex === null) {
			return undefined;
		}
		const onKey = (e) => {
			if (e.key !== 'Escape') {
				return;
			}
			/* Tile multi-select owns Escape while mode is active. */
			if (tileSelection?.modeActive) {
				return;
			}
			e.preventDefault();
			e.stopPropagation();
			if (view === 'focus') {
				setView('edit');
				return;
			}
			setStoreIndex(null);
			setView('edit');
			blurPreviewItemSelectHit();
		};
		window.addEventListener('keydown', onKey, true);
		return () => window.removeEventListener('keydown', onKey, true);
	}, [storeIndex, view, tileSelection?.modeActive]);

	const value = useMemo(
		() => ({
			storeIndex,
			view,
			open,
			openFocus,
			closeFocus,
			close,
			isOpen: storeIndex !== null,
		}),
		[storeIndex, view, open, openFocus, closeFocus, close]
	);

	return (
		<GalleryItemEditSidebarContext.Provider value={value}>
			{children}
		</GalleryItemEditSidebarContext.Provider>
	);
}
