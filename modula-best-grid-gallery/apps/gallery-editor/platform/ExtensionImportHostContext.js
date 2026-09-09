import { createContext, useContext } from '@wordpress/element';

/** @typedef {{
 *   galleryId: number,
 *   uploadPosition: 'start' | 'end',
 *   invalidateBootstrap: () => void,
 *   runPersistTask: (task: () => void | Promise<void>) => Promise<unknown>,
 *   form: import('@tanstack/react-form').ReactFormExtendedApi,
 *   config: Record<string, unknown>,
 * }} ExtensionImportHostValue */

/** @type {import('react').Context<ExtensionImportHostValue | null>} */
const ExtensionImportHostContext = createContext(null);

/**
 * Host services for takeover extension import workflows (Instagram, Content Galleries, Video, …).
 *
 * @param {{ value: ExtensionImportHostValue, children?: import('react').ReactNode }} props
 */
export function ExtensionImportHostProvider({ value, children }) {
	return (
		<ExtensionImportHostContext.Provider value={value}>
			{children}
		</ExtensionImportHostContext.Provider>
	);
}

/**
 * @return {ExtensionImportHostValue}
 */
export function useExtensionImportHost() {
	const ctx = useContext(ExtensionImportHostContext);
	if (!ctx) {
		throw new Error(
			'useExtensionImportHost must be used within ExtensionImportHostProvider'
		);
	}
	return ctx;
}
