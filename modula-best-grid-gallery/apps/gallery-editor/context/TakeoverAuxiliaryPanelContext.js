import {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useState,
} from '@wordpress/element';

/**
 * @typedef {'chrome' | 'category' | 'settings'} TakeoverAuxiliaryOpenSource
 */

/**
 * @typedef {{ kind: 'hoverEffectBuilder' }} HoverEffectBuilderAuxiliaryDescriptor
 */

/**
 * @typedef {HoverEffectBuilderAuxiliaryDescriptor} TakeoverAuxiliaryDescriptor
 */

/**
 * @typedef {Object} TakeoverAuxiliaryState
 * @property {TakeoverAuxiliaryOpenSource} openedFrom     chrome toolbar, settings category nav, or a settings row
 * @property {string}                      [categoryName] category key when `openedFrom` is category
 * @property {TakeoverAuxiliaryDescriptor} descriptor     what to render (`hoverEffectBuilder`)
 */

const TakeoverAuxiliaryPanelContext = createContext(null);

/**
 * @param {Object}                    props
 * @param {import('react').ReactNode} props.children
 */
export function TakeoverAuxiliaryPanelProvider({ children }) {
	const [auxiliary, setAuxiliary] = useState(
		/** @type {TakeoverAuxiliaryState | null} */ (null)
	);

	const closePanel = useCallback(() => {
		setAuxiliary(null);
	}, []);

	const openFromChrome = useCallback(
		/**
		 * @param {TakeoverAuxiliaryDescriptor} descriptor
		 */
		(descriptor) => {
			setAuxiliary({
				openedFrom: 'chrome',
				descriptor,
			});
		},
		[]
	);

	const openFromCategory = useCallback(
		/**
		 * @param {string}                      categoryName
		 * @param {TakeoverAuxiliaryDescriptor} descriptor
		 */
		(categoryName, descriptor) => {
			setAuxiliary({
				openedFrom: 'category',
				categoryName,
				descriptor,
			});
		},
		[]
	);

	const openFromSettings = useCallback(
		/**
		 * A settings row of the active tab opens the panel (the hover effect
		 * builder's Customize). It closes when the tab changes or the row
		 * leaves the panel (`closeFromSettings`).
		 *
		 * @param {TakeoverAuxiliaryDescriptor} descriptor
		 */
		(descriptor) => {
			setAuxiliary({
				openedFrom: 'settings',
				descriptor,
			});
		},
		[]
	);

	// Leaves a panel the chrome or the category opened in place.
	const closeFromSettings = useCallback(() => {
		setAuxiliary((prev) => (prev?.openedFrom === 'settings' ? null : prev));
	}, []);

	const value = useMemo(
		() => ({
			auxiliary,
			/** True when any auxiliary panel is open (form field / hover builder). */
			isAuxiliaryOpen: auxiliary !== null,
			openFromChrome,
			openFromCategory,
			openFromSettings,
			closeFromSettings,
			closePanel,
		}),
		[
			auxiliary,
			openFromChrome,
			openFromCategory,
			openFromSettings,
			closeFromSettings,
			closePanel,
		]
	);

	return (
		<TakeoverAuxiliaryPanelContext.Provider value={value}>
			{children}
		</TakeoverAuxiliaryPanelContext.Provider>
	);
}

/**
 * For rows that render in both editors: the takeover's auxiliary panel, or
 * null in the metabox editor, which has none.
 *
 * @return {ReturnType<typeof useTakeoverAuxiliaryPanel>|null} The panel API, or null outside the takeover.
 */
export function useOptionalTakeoverAuxiliaryPanel() {
	return useContext(TakeoverAuxiliaryPanelContext);
}

export function useTakeoverAuxiliaryPanel() {
	const ctx = useContext(TakeoverAuxiliaryPanelContext);
	if (!ctx) {
		throw new Error(
			'useTakeoverAuxiliaryPanel must be used within TakeoverAuxiliaryPanelProvider'
		);
	}
	return ctx;
}
