import {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useState,
} from '@wordpress/element';

/**
 * @typedef {'chrome' | 'category'} TakeoverAuxiliaryOpenSource
 */

/**
 * @typedef {Object} FormFieldAuxiliaryDescriptor
 * @property {'formField'} kind        routed panel kind (`formField` → schema lookup)
 * @property {string}      groupedPath dotted path matching form schema `groupedPath`
 */

/**
 * @typedef {{ kind: 'hoverEffectBuilder', mode?: 'customizeOnly' }} HoverEffectBuilderAuxiliaryDescriptor
 */

/**
 * @typedef {FormFieldAuxiliaryDescriptor | HoverEffectBuilderAuxiliaryDescriptor} TakeoverAuxiliaryDescriptor
 */

/**
 * @typedef {Object} TakeoverAuxiliaryState
 * @property {TakeoverAuxiliaryOpenSource} openedFrom     chrome toolbar vs settings category nav
 * @property {string}                      [categoryName] category key when `openedFrom` is category
 * @property {TakeoverAuxiliaryDescriptor} descriptor     what to render (`formField`, `hoverEffectBuilder`, …)
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

	const value = useMemo(
		() => ({
			auxiliary,
			/** True when any auxiliary panel is open (form field / hover builder). */
			isAuxiliaryOpen: auxiliary !== null,
			openFromChrome,
			openFromCategory,
			closePanel,
		}),
		[auxiliary, openFromChrome, openFromCategory, closePanel]
	);

	return (
		<TakeoverAuxiliaryPanelContext.Provider value={value}>
			{children}
		</TakeoverAuxiliaryPanelContext.Provider>
	);
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
