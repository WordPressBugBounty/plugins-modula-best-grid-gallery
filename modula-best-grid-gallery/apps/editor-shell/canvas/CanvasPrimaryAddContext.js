/**
 * The canvas's primary Add action. `AddSplit` registers its main action, and
 * the empty canvas's call to action ("Add images") runs the same one.
 * `TakeoverLayout` provides it.
 */
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from '@wordpress/element';

/** @type {import('react').Context<((action: () => void) => () => void)|null>} */
const RegisterCanvasPrimaryAddContext = createContext(null);
/** @type {import('react').Context<(() => void)|null>} */
const CanvasPrimaryAddContext = createContext(null);

/**
 * @param {Object}                    props
 * @param {import('react').ReactNode} props.children
 */
export function CanvasPrimaryAddProvider({ children }) {
	const [primaryAdd, setPrimaryAdd] = useState(
		/** @type {(() => void)|null} */ (null)
	);

	const register = useCallback((action) => {
		setPrimaryAdd(() => action);
		return () =>
			setPrimaryAdd((current) => (current === action ? null : current));
	}, []);

	return (
		<RegisterCanvasPrimaryAddContext.Provider value={register}>
			<CanvasPrimaryAddContext.Provider value={primaryAdd}>
				{children}
			</CanvasPrimaryAddContext.Provider>
		</RegisterCanvasPrimaryAddContext.Provider>
	);
}

/**
 * Register the primary Add action while the caller is mounted. The latest
 * `action` runs, so it need not be stable. Pass null to register none.
 *
 * @param {(() => void)|null|undefined} action
 */
export function useRegisterCanvasPrimaryAdd(action) {
	const register = useContext(RegisterCanvasPrimaryAddContext);
	const actionRef = useRef(action);
	const hasAction = typeof action === 'function';

	useEffect(() => {
		actionRef.current = action;
	}, [action]);

	const runLatest = useCallback(() => actionRef.current?.(), []);

	useEffect(() => {
		if (!register || !hasAction) {
			return undefined;
		}
		return register(runLatest);
	}, [register, hasAction, runLatest]);
}

/**
 * @return {(() => void)|null} The primary Add action, or null while none is registered.
 */
export function useCanvasPrimaryAdd() {
	return useContext(CanvasPrimaryAddContext);
}
