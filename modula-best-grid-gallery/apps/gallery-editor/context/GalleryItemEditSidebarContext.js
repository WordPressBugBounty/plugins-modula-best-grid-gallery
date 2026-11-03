/**
 * Settings-editor: which preview item is selected, and which one is open in
 * the Image sidebar panel. A tile click selects; "Edit" opens the panel
 * (`itemSelectionState.js` holds the rules).
 */
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useReducer,
} from '@wordpress/element';
import { isEventInOpenDialog, isEventInPopover } from 'editor-shell';
import { useTakeoverSidebarStack } from './TakeoverSidebarStackContext';
import { useGalleryPreviewTileSelection } from './GalleryPreviewTileSelectionContext';
import {
	INITIAL_ITEM_SELECTION,
	itemSelectionReducer,
} from './itemSelectionState';

/** @typedef {import('./itemSelectionState').GalleryItemEditView} GalleryItemEditView */

/**
 * @typedef {{
 *   storeIndex: number | null,
 *   selectedIndex: number | null,
 *   view: GalleryItemEditView,
 *   select: (storeIndex: number) => void,
 *   open: (storeIndex: number) => void,
 *   openFocus: (storeIndex: number) => void,
 *   closeFocus: () => void,
 *   back: () => void,
 *   close: () => void,
 *   isOpen: boolean,
 * }} GalleryItemEditSidebarValue
 * `storeIndex` is the item open in the panel; `back` leaves the panel and
 * keeps the selection; `close` drops both (store indices may have shifted).
 */

/** @type {import('react').Context<GalleryItemEditSidebarValue | null>} */
export const GalleryItemEditSidebarContext = createContext(null);

const LIVE_PREVIEW_SELECTOR = '.modula-gallery-takeover__live-preview';

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
 * With only a selection (no panel), Escape belongs to the preview: a key in a
 * settings field or menu must keep its own Escape.
 *
 * @param {KeyboardEvent} event
 * @return {boolean} Whether the key was pressed in the preview or on the page body.
 */
function isPreviewKey(event) {
	const target = event.target;
	if (!(target instanceof Element)) {
		return true;
	}
	return (
		target === target.ownerDocument.body ||
		Boolean(target.closest(LIVE_PREVIEW_SELECTOR))
	);
}

/**
 * @return {GalleryItemEditSidebarValue | null} Selection and panel state.
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
	const [state, dispatch] = useReducer(
		itemSelectionReducer,
		INITIAL_ITEM_SELECTION
	);
	const { selectedIndex, editIndex, view } = state;

	const select = useCallback((idx) => {
		dispatch({ type: 'select', index: Number(idx) });
	}, []);

	const showPanel = useCallback(
		(type, idx) => {
			const index = Number(idx);
			if (!Number.isInteger(index) || index < 0) {
				return;
			}
			clearStack();
			dispatch({ type, index });
		},
		[clearStack]
	);
	const open = useCallback((idx) => showPanel('open', idx), [showPanel]);
	const openFocus = useCallback(
		(idx) => showPanel('openFocus', idx),
		[showPanel]
	);

	const closeFocus = useCallback(() => {
		dispatch({ type: 'closeFocus' });
	}, []);

	const back = useCallback(() => {
		dispatch({ type: 'back' });
	}, []);

	const close = useCallback(() => {
		dispatch({ type: 'clear' });
		blurPreviewItemSelectHit();
	}, []);

	const hasSelection = selectedIndex !== null || editIndex !== null;

	/*
	 * Multi-select mode replaces the Image edit form and the tile selection:
	 * clear both so the previous category tab shows again.
	 */
	useEffect(() => {
		if (!tileSelection?.modeActive || !hasSelection) {
			return;
		}
		close();
	}, [tileSelection?.modeActive, hasSelection, close]);

	useEffect(() => {
		if (!hasSelection) {
			return undefined;
		}
		const onKey = (e) => {
			// Escape in a popover (Sort) or a dialog closes that only.
			if (
				e.key !== 'Escape' ||
				isEventInPopover(e) ||
				isEventInOpenDialog(e)
			) {
				return;
			}
			/* Tile multi-select owns Escape while mode is active. */
			if (tileSelection?.modeActive) {
				return;
			}
			if (editIndex === null && !isPreviewKey(e)) {
				return;
			}
			e.preventDefault();
			e.stopPropagation();
			dispatch({ type: 'escape' });
		};
		window.addEventListener('keydown', onKey, true);
		return () => window.removeEventListener('keydown', onKey, true);
	}, [hasSelection, editIndex, tileSelection?.modeActive]);

	const value = useMemo(
		() => ({
			storeIndex: editIndex,
			selectedIndex,
			view,
			select,
			open,
			openFocus,
			closeFocus,
			back,
			close,
			isOpen: editIndex !== null,
		}),
		[
			editIndex,
			selectedIndex,
			view,
			select,
			open,
			openFocus,
			closeFocus,
			back,
			close,
		]
	);

	return (
		<GalleryItemEditSidebarContext.Provider value={value}>
			{children}
		</GalleryItemEditSidebarContext.Provider>
	);
}
