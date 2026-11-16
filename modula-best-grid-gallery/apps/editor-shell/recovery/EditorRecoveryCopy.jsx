/**
 * React binding of the recovery copy (ADR 0059): one controller per editor
 * save session that opts in, the Restore / Discard notice, and the hook an
 * editor uses to report the saved-state marker of writes that do not run
 * through the takeover write queue.
 *
 * Opt-in: `EditorSaveSessionProvider` mounts it only with a `recovery` prop.
 * Without it the notice renders nothing and the hook does nothing.
 */
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
	useSyncExternalStore,
} from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Button, Notice } from 'admin-ui';
import { useTakeoverSaveStatus } from '../save-status/TakeoverSaveStatusContext';
import { readRestSavedState } from '../save-status/restPostStatus';
import { createRecoveryCopyController } from './recoveryCopyController';

/**
 * What an editor passes to opt in.
 *
 * @typedef {Object} EditorRecoveryOptions
 * @property {import('./recoveryCopyStore').RecoveryDocumentIdentity} identity   Site, user, document type and id (one copy per document, per site and user).
 * @property {string|null}                                            savedState The document's saved-state marker when the editor opened (the server's `savedState`; null for a never-saved document).
 */

const EditorRecoveryContext = createContext(null);

/**
 * @param {Object}                    props
 * @param {Object}                    props.session  The editor save session.
 * @param {EditorRecoveryOptions}     props.recovery Read once, on mount.
 * @param {import('react').ReactNode} props.children
 */
export function EditorRecoveryCopyProvider({ session, recovery, children }) {
	const [controller] = useState(() =>
		createRecoveryCopyController({
			session,
			identity: recovery.identity,
			savedState: recovery.savedState,
		})
	);
	const { subscribeWriteResults } = useTakeoverSaveStatus();

	useEffect(() => {
		controller.start();
		return () => controller.stop();
	}, [controller]);

	// Queued writes return the marker of the state they stored.
	useEffect(
		() =>
			subscribeWriteResults((result) => {
				const marker = readRestSavedState(result);
				if (marker !== undefined) {
					controller.adoptSavedState(marker);
				}
			}),
		[controller, subscribeWriteResults]
	);

	// A change still waiting for its quiet time is kept when the tab goes away.
	useEffect(() => {
		const flush = () => controller.flush();
		window.addEventListener('pagehide', flush);
		return () => window.removeEventListener('pagehide', flush);
	}, [controller]);

	return (
		<EditorRecoveryContext.Provider value={controller}>
			{children}
		</EditorRecoveryContext.Provider>
	);
}

/**
 * For writes outside the takeover write queue (e.g. a settings PATCH): pass
 * each successful response, so the recovery copy is based on the state that
 * write stored. A no-op without a recovery copy.
 *
 * @return {(response: unknown) => void} Reads `savedState` from a REST response body.
 */
export function useEditorSavedStateSync() {
	const controller = useContext(EditorRecoveryContext);
	return useCallback(
		(response) => {
			const marker = readRestSavedState(response);
			if (controller && marker !== undefined) {
				controller.adoptSavedState(marker);
			}
		},
		[controller]
	);
}

const NO_OFFER_SUBSCRIBE = () => () => {};
const NO_OFFER = () => null;

/**
 * The offer of a recovery copy left by an earlier visit: Restore applies it as
 * unsaved changes, Discard removes it. When the document was saved elsewhere
 * since, it also says that Restore overwrites those changes. Renders nothing
 * without an offer; editors place it under their canvas toolbar.
 */
export function EditorRecoveryNotice() {
	const controller = useContext(EditorRecoveryContext);
	const offer = useSyncExternalStore(
		controller ? controller.subscribe : NO_OFFER_SUBSCRIBE,
		controller ? controller.getOffer : NO_OFFER
	);
	if (!offer) {
		return null;
	}

	return (
		<Notice
			tone="warning"
			role="region"
			aria-label={__('Unsaved changes found', 'modula-best-grid-gallery')}
			className="modula-takeover__recovery-notice"
		>
			<p>
				{__(
					'Unsaved changes from your last visit were kept in this browser.',
					'modula-best-grid-gallery'
				)}
				{offer.savedElsewhere
					? ` ${__(
							'This was saved elsewhere since then. Restore will overwrite those changes.',
							'modula-best-grid-gallery'
						)}`
					: null}
			</p>
			<div className="modula-takeover__recovery-notice-actions">
				<Button variant="primary" onClick={controller.restore}>
					{__('Restore', 'modula-best-grid-gallery')}
				</Button>
				<Button variant="secondary" onClick={controller.discard}>
					{__('Discard', 'modula-best-grid-gallery')}
				</Button>
			</div>
		</Notice>
	);
}
