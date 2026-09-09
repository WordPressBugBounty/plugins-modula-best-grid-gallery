/**
 * Debounced preview item persist + bootstrap refresh (takeover live preview only).
 */
import { createContext, useContext } from '@wordpress/element';

/** @type {import('react').Context<PreviewItemPersistApi|null>} */
const PreviewItemPersistContext = createContext(null);

/**
 * @typedef {Object} PreviewItemPersistApi
 * @property {(task: () => void | Promise<void>) => Promise<void>} runPersistTaskWithDeferredRefresh
 * @property {() => Promise<void>} flushPreviewItemsPersistNow
 * @property {() => void} resetPreviewPersistDirty
 */

/**
 * @param {{ value: PreviewItemPersistApi, children: import('react').ReactNode }} props
 */
export function PreviewItemPersistProvider({ value, children }) {
	return (
		<PreviewItemPersistContext.Provider value={value}>
			{children}
		</PreviewItemPersistContext.Provider>
	);
}

/**
 * @return {PreviewItemPersistApi|null}
 */
export function usePreviewItemPersist() {
	return useContext(PreviewItemPersistContext);
}
