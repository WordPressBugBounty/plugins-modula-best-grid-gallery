import { createContext, useContext } from '@wordpress/element';

const GallerySettingsFormContext = createContext(null);

/**
 * Mirrors the return value of `useGallerySettingsForm` (same folder).
 *
 * @typedef {Object} GallerySettingsFormBundle
 * @property {Object}                                                                    form                    TanStack `useForm` API (grouped v2 values).
 * @property {Object}                                                                    patchMutation           `useMutation` from `usePatchGallerySettingsV2Mutation`.
 * @property {string}                                                                    clientError
 * @property {(v: string) => void}                                                       setClientError
 * @property {import('react').MutableRefObject<Record<string, Record<string, unknown>>>} baselineRef
 * @property {import('react').MutableRefObject<string>}                                  lastServerSerializedRef
 * @property {{
 *   undo: () => void,
 *   redo: () => void,
 *   canUndo: boolean,
 *   canRedo: boolean,
 *   lastStepLabel: string,
 *   undoStepLabel: string,
 *   redoStepLabel: string,
 *   syncCheckpointFromForm: (values?: Record<string, Record<string, unknown>>) => void,
 *   adoptCheckpointFromForm: (values?: Record<string, Record<string, unknown>>) => void,
 *   stackVersion: number,
 * }} undoRedo
 */

/**
 * @param {{
 *   value: GallerySettingsFormBundle,
 *   children?: import('react').ReactNode,
 * }} props
 */
export function GallerySettingsFormProvider({ value, children }) {
	return (
		<GallerySettingsFormContext.Provider value={value}>
			{children}
		</GallerySettingsFormContext.Provider>
	);
}

/**
 * @return {GallerySettingsFormBundle}
 */
export function useGallerySettingsFormBundle() {
	const bundle = useContext(GallerySettingsFormContext);
	if (!bundle) {
		throw new Error(
			'useGallerySettingsFormBundle must be used within GallerySettingsFormProvider'
		);
	}
	return bundle;
}
