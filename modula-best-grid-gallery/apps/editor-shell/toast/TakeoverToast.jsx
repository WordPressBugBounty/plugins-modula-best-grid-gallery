/**
 * The editor's toast: one message at a time, at the foot of the canvas
 * (bottom right, as in the canvas "1 · Editor"). A removal toast carries
 * Undo as its action.
 *
 * `TakeoverLayout` provides it to its regions; editors call
 * `useTakeoverToast()`. Without a provider the hook returns null, so callers
 * shared with other surfaces can skip the toast.
 */
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from '@wordpress/element';
import { Toast } from 'admin-ui';
import AdminUiScope from '../appearance/AdminUiScope';

/**
 * @typedef {{ label: string, onClick: Function }} TakeoverToastAction
 * @typedef {{ message: string, action?: TakeoverToastAction|null, tone?: 'success'|'error' }} TakeoverToastInput
 * @typedef {{ show: (toast: TakeoverToastInput) => number, dismiss: (id: number) => void }} TakeoverToastApi
 */

const NO_TOAST = { id: 0, message: '', action: null, tone: 'success' };

/** @type {import('react').Context<TakeoverToastApi|null>} */
const TakeoverToastContext = createContext(null);

/**
 * @return {TakeoverToastApi|null} Null outside `TakeoverToastProvider`.
 */
export function useTakeoverToast() {
	return useContext(TakeoverToastContext);
}

/**
 * @param {Object}                    props
 * @param {import('react').ReactNode} props.children
 */
export function TakeoverToastProvider({ children }) {
	const [toast, setToast] = useState(NO_TOAST);
	const lastIdRef = useRef(0);
	// The toast waiting for its frame (see `show`).
	const pendingRef = useRef({ id: 0, frame: 0 });

	useEffect(
		() => () => window.cancelAnimationFrame(pendingRef.current.frame),
		[]
	);

	const show = useCallback(({ message, action = null, tone = 'success' }) => {
		lastIdRef.current += 1;
		const next = { id: lastIdRef.current, message, action, tone };
		// The live region announces a message when it changes, and the
		// toast's timer restarts per message. Clear it for a frame, so a
		// second "Image removed" is announced and timed like the first.
		setToast(NO_TOAST);
		window.cancelAnimationFrame(pendingRef.current.frame);
		pendingRef.current = {
			id: next.id,
			frame: window.requestAnimationFrame(() => setToast(next)),
		};
		return next.id;
	}, []);

	// Only the named toast goes: a toast's own timer or action must not
	// dismiss the one that replaced it.
	const dismiss = useCallback((id) => {
		if (pendingRef.current.id === id) {
			window.cancelAnimationFrame(pendingRef.current.frame);
		}
		setToast((current) => (current.id === id ? NO_TOAST : current));
	}, []);

	const api = useMemo(() => ({ show, dismiss }), [show, dismiss]);

	return (
		<TakeoverToastContext.Provider value={api}>
			{children}
			<AdminUiScope>
				<div className="modula-takeover__toast">
					<Toast
						message={toast.message}
						tone={toast.tone}
						action={toast.action}
						onDismiss={() => dismiss(toast.id)}
					/>
				</div>
			</AdminUiScope>
		</TakeoverToastContext.Provider>
	);
}
