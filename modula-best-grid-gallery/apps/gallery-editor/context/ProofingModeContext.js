/**
 * Gallery proofing lock state for takeover (client transition without reload),
 * and whether the proofing manager (Pro's modal) is open.
 * Lock REST lives in Pro; Lite provider calls the registered API when available.
 */

import {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useState,
} from '@wordpress/element';
import { useMutation } from '@tanstack/react-query';
import { useModulaSettingsEditorConfig } from '../hooks/useModulaSettingsEditorConfig';
import { useProofingGalleryCapabilities } from '../hooks/useProofingGalleryCapabilities';
import { getImageProofingEditorRegistration } from '../platform/imageProofingRegistry';

/** @type {import('react').Context<null | Record<string, unknown>>} */
const ProofingModeContext = createContext(null);

/**
 * @param {Object}                    props
 * @param {number}                    props.galleryId
 * @param {import('react').ReactNode} props.children
 */
export function ProofingModeProvider({ galleryId, children }) {
	const config = useModulaSettingsEditorConfig();
	const { canUseImageProofing } = useProofingGalleryCapabilities();

	const [isLocked, setIsLocked] = useState(() =>
		Boolean(config.lockedForProofing)
	);
	// A gallery that opens locked lands on its proofing, as the old proofing
	// shell did; closing the manager reveals the editor.
	const [isManagerOpen, setIsManagerOpen] = useState(
		() => Boolean(config.lockedForProofing) && canUseImageProofing
	);

	// A missing API or a response without `updated` is a failure, so callers
	// (the lock button, Pro's Stop proofing) can say so.
	const lockMutation = useMutation({
		mutationFn: async (lock) => {
			const api = getImageProofingEditorRegistration()?.api;
			if (typeof api?.setProofingGalleryLock !== 'function') {
				throw new Error('The image proofing API is not registered.');
			}
			const response = await api.setProofingGalleryLock(galleryId, lock);
			if (!response?.updated) {
				throw new Error('The proofing lock was not updated.');
			}
			return response;
		},
		onSuccess: (response, lock) => setIsLocked(Boolean(lock)),
	});

	const unlock = useCallback(async () => {
		if (!canUseImageProofing || !galleryId) {
			return;
		}
		await lockMutation.mutateAsync(false);
	}, [canUseImageProofing, galleryId, lockMutation]);

	// The manager only works on a locked gallery, so opening it locks first.
	const openManager = useCallback(() => {
		if (!canUseImageProofing || !galleryId) {
			return;
		}
		if (isLocked) {
			setIsManagerOpen(true);
			return;
		}
		lockMutation.mutate(true, { onSuccess: () => setIsManagerOpen(true) });
	}, [canUseImageProofing, galleryId, isLocked, lockMutation]);

	const closeManager = useCallback(() => setIsManagerOpen(false), []);

	const lockFailed = lockMutation.isError && lockMutation.variables === true;

	const value = useMemo(
		() => ({
			galleryId,
			isLocked,
			canUseImageProofing,
			isLockPending: lockMutation.isPending,
			lockFailed,
			unlock,
			isManagerOpen,
			openManager,
			closeManager,
		}),
		[
			galleryId,
			isLocked,
			canUseImageProofing,
			lockMutation.isPending,
			lockFailed,
			unlock,
			isManagerOpen,
			openManager,
			closeManager,
		]
	);

	return (
		<ProofingModeContext.Provider value={value}>
			{children}
		</ProofingModeContext.Provider>
	);
}

/**
 * @return {{
 *   galleryId: number,
 *   isLocked: boolean,
 *   canUseImageProofing: boolean,
 *   isLockPending: boolean,
 *   lockFailed: boolean,
 *   unlock: () => Promise<void>,
 *   isManagerOpen: boolean,
 *   openManager: () => void,
 *   closeManager: () => void,
 * }} Lock state and actions, and the proofing manager's open state.
 */
export function useProofingMode() {
	const ctx = useContext(ProofingModeContext);
	if (!ctx) {
		throw new Error(
			'useProofingMode must be used within ProofingModeProvider'
		);
	}
	return ctx;
}
