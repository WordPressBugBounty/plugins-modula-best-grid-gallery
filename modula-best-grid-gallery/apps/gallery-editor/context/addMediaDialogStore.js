/**
 * Open state of the takeover's Add media dialog. Every "Add" entry (the
 * toolbar's Add split, the canvas empty state) opens the dialog through
 * `openAddMedia`; the dialog itself mounts once, beside the layout
 * (`AddMediaDialogLazy`). The takeover has one dialog per page, so the state
 * is a small module store rather than a provider around the layout.
 */
import { useSyncExternalStore } from '@wordpress/element';

/** @typedef {'upload'|'library'|'link'} AddMediaTab */

/** @type {AddMediaTab[]} */
export const ADD_MEDIA_TABS = ['upload', 'library', 'link'];

/** @type {AddMediaTab|null} Null while the dialog is closed. */
let openTab = null;

/** @type {Set<() => void>} */
const listeners = new Set();

/**
 * @param {AddMediaTab|null} next
 */
function setOpenTab(next) {
	if (next === openTab) {
		return;
	}
	openTab = next;
	listeners.forEach((listener) => listener());
}

/**
 * Opens the dialog on a tab, or switches the open dialog to it.
 *
 * @param {AddMediaTab} [tab] Defaults to the Media library, as the primary Add.
 */
export function openAddMedia(tab = 'library') {
	setOpenTab(ADD_MEDIA_TABS.includes(tab) ? tab : 'library');
}

export function closeAddMedia() {
	setOpenTab(null);
}

/**
 * @param {() => void} listener
 * @return {() => void} Unsubscribe.
 */
function subscribe(listener) {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

const getOpenTab = () => openTab;

/**
 * @return {{
 *   isOpen: boolean,
 *   openTab: AddMediaTab|null,
 *   openAddMedia: (tab?: AddMediaTab) => void,
 *   closeAddMedia: () => void,
 * }} The dialog's state and its two actions.
 */
export function useAddMediaDialog() {
	const current = useSyncExternalStore(subscribe, getOpenTab, getOpenTab);

	return {
		isOpen: current !== null,
		openTab: current,
		openAddMedia,
		closeAddMedia,
	};
}
