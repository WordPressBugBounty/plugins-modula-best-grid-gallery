import {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useState,
} from '@wordpress/element';

/**
 * @typedef {{
 *   title: string,
 *   groupedPaths: string[],
 *   hubHelp?: string,
 *   auxiliaryPanel?: { kind: string, groupedPath?: string, mode?: string } | null,
 *   nestedUpsellGroupedPath?: string
 * }} SidebarNestedFrame
 */

const MAX_SIDEBAR_NEST_DEPTH = 32;

const TakeoverSidebarStackContext = createContext(null);

/**
 * Virtual nested levels inside the main settings sidebar (takeover + classic shell).
 * Auxiliary column stays separate.
 *
 * @param {Object}                    props
 * @param {import('react').ReactNode} props.children
 */
export function TakeoverSidebarStackProvider({ children }) {
	const [stack, setStack] = useState(
		/** @type {SidebarNestedFrame[]} */ ([])
	);

	const pushFrame = useCallback(
		/**
		 * @param {SidebarNestedFrame} frame
		 */
		(frame) => {
			if (
				!frame ||
				typeof frame.title !== 'string' ||
				!Array.isArray(frame.groupedPaths) ||
				frame.groupedPaths.length === 0
			) {
				return;
			}
			setStack((prev) => {
				if (prev.length >= MAX_SIDEBAR_NEST_DEPTH) {
					return prev;
				}
				const paths = frame.groupedPaths
					.map((p) => (typeof p === 'string' ? p.trim() : ''))
					.filter(Boolean);
				if (paths.length === 0) {
					return prev;
				}
				const nextFrame = {
					title: frame.title.trim(),
					groupedPaths: paths,
				};
				if (
					typeof frame.hubHelp === 'string' &&
					frame.hubHelp.trim() !== ''
				) {
					nextFrame.hubHelp = frame.hubHelp.trim();
				}
				if (
					frame.auxiliaryPanel &&
					typeof frame.auxiliaryPanel === 'object' &&
					typeof frame.auxiliaryPanel.kind === 'string' &&
					frame.auxiliaryPanel.kind !== ''
				) {
					nextFrame.auxiliaryPanel = frame.auxiliaryPanel;
				}
				if (
					typeof frame.nestedUpsellGroupedPath === 'string' &&
					frame.nestedUpsellGroupedPath.trim() !== ''
				) {
					nextFrame.nestedUpsellGroupedPath =
						frame.nestedUpsellGroupedPath.trim();
				}
				return [...prev, nextFrame];
			});
		},
		[]
	);

	const popFrame = useCallback(() => {
		setStack((prev) => (prev.length === 0 ? prev : prev.slice(0, -1)));
	}, []);

	const clearStack = useCallback(() => {
		setStack([]);
	}, []);

	const setTopFrameAuxiliaryPanel = useCallback(
		/**
		 * @param {{ kind: string, groupedPath?: string, mode?: string } | null} descriptor
		 */
		(descriptor) => {
			setStack((prev) => {
				if (prev.length === 0) {
					return prev;
				}
				const top = prev[prev.length - 1];
				const nextTop = { ...top };
				if (
					descriptor &&
					typeof descriptor === 'object' &&
					typeof descriptor.kind === 'string' &&
					descriptor.kind !== ''
				) {
					nextTop.auxiliaryPanel = { ...descriptor };
				} else {
					delete nextTop.auxiliaryPanel;
				}
				return [...prev.slice(0, -1), nextTop];
			});
		},
		[]
	);

	const value = useMemo(
		() => ({
			stack,
			stackDepth: stack.length,
			pushFrame,
			popFrame,
			clearStack,
			setTopFrameAuxiliaryPanel,
		}),
		[stack, pushFrame, popFrame, clearStack, setTopFrameAuxiliaryPanel]
	);

	return (
		<TakeoverSidebarStackContext.Provider value={value}>
			{children}
		</TakeoverSidebarStackContext.Provider>
	);
}

/**
 * @return {{
 *   stack: SidebarNestedFrame[],
 *   stackDepth: number,
 *   pushFrame: (frame: SidebarNestedFrame) => void,
 *   popFrame: () => void,
 *   clearStack: () => void,
 *   setTopFrameAuxiliaryPanel: (descriptor: { kind: string, groupedPath?: string, mode?: string } | null) => void,
 * }}
 */
export function useTakeoverSidebarStack() {
	const ctx = useContext(TakeoverSidebarStackContext);
	if (!ctx) {
		throw new Error(
			'useTakeoverSidebarStack must be used within TakeoverSidebarStackProvider'
		);
	}
	return ctx;
}
