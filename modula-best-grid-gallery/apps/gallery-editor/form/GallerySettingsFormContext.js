import { createContext, useContext } from '@wordpress/element';

const GallerySettingsFormContext = createContext(null);

/**
 * Mirrors the return value of `useGallerySettingsForm` (same folder).
 *
 * @typedef {Object} GalleryEditorUndoRedo
 * @property {() => void}                                                                                                                                undo
 * @property {() => void}                                                                                                                                redo
 * @property {boolean}                                                                                                                                   canUndo
 * @property {boolean}                                                                                                                                   canRedo
 * @property {string}                                                                                                                                    lastStepLabel
 * @property {string}                                                                                                                                    undoStepLabel
 * @property {string}                                                                                                                                    redoStepLabel
 * @property {number|null}                                                                                                                               currentStepId           Id of the step at the cursor (null at the checkpoint).
 * @property {(values?: Record<string, Record<string, unknown>>) => void}                                                                                syncCheckpointFromForm
 * @property {(values?: Record<string, Record<string, unknown>>) => void}                                                                                adoptCheckpointFromForm
 * @property {number}                                                                                                                                    stackVersion
 * @property {{ index: number, type: 'settings'|'layout'|'items', label: string, position: 'past'|'current'|'future' }[]}                                historyEntries
 * @property {(index: number) => { type: 'settings'|'layout'|'items'|null, settings: Record<string, Record<string, unknown>>, layout: Record<string, unknown> }|null} jumpTo                  Index -1 restores the original settings.
 * @property {(label: string, mutate: () => void) => void}                                                                                               commitSettingsStep
 * @property {(args: { label: string, layout: Record<string, unknown> }) => void}                                                                        commitLayoutStep
 * @property {(layout: Record<string, unknown>|null|undefined) => void}                                                                                  adoptLayoutCheckpoint
 * @property {() => void}                                                                                                                                dropLayoutSteps
 * @property {(applyLayout: ((layout: Record<string, unknown>) => void)|null) => () => void}                                                             registerLayoutApplier
 * @property {(args: { label: string, change: unknown }) => number}                                                                                      commitItemsStep         Returns the step id.
 * @property {(applyItems: ((op: { direction: 'undo'|'redo', change: unknown }) => void)|null) => () => void}                                            registerItemsApplier
 *
 * @typedef {Object} GallerySettingsFormBundle
 * @property {Object}                                                                                                                                    form                    TanStack `useForm` API (grouped v2 values).
 * @property {Object}                                                                                                                                    patchMutation           `useMutation` from `usePatchGallerySettingsV2Mutation`.
 * @property {string}                                                                                                                                    clientError
 * @property {(v: string) => void}                                                                                                                       setClientError
 * @property {import('react').MutableRefObject<Record<string, Record<string, unknown>>>}                                                                 baselineRef
 * @property {import('react').MutableRefObject<string>}                                                                                                  lastServerSerializedRef
 * @property {GalleryEditorUndoRedo}                                                                                                                     undoRedo
 * @property {(snapshot: Object, serverData: Object) => void}                                                                                            acknowledgeSettingsSave
 * @property {() => (() => void)}                                                                                                                        beginSettingsGesture
 * @property {(values?: Object) => Object}                                                                                                               getPendingSettingsPatch
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
