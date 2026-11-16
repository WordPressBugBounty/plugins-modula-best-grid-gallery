/**
 * The gallery items part of the editor save session, for preview components
 * (takeover live preview only).
 */
import { createContext, useContext } from '@wordpress/element';

/** @type {import('react').Context<PreviewItemsPartApi|null>} */
const PreviewItemsPartContext = createContext(null);

/**
 * @typedef {Object} PreviewItemsPartApi
 * @property {(catalog: Object[]) => void} commitDerivedItems Commit a catalog change derived from the stored one; it is not an unsaved change.
 */

/**
 * @param {{ value: PreviewItemsPartApi, children: import('react').ReactNode }} props
 */
export function PreviewItemsPartProvider({ value, children }) {
	return (
		<PreviewItemsPartContext.Provider value={value}>
			{children}
		</PreviewItemsPartContext.Provider>
	);
}

/**
 * @return {PreviewItemsPartApi|null} The items part, or null outside the live preview.
 */
export function usePreviewItemsPart() {
	return useContext(PreviewItemsPartContext);
}
