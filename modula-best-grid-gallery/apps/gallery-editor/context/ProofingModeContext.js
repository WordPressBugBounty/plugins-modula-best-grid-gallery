/**
 * Gallery proofing lock state for takeover (client transition without reload).
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
 * @param {Object}      props
 * @param {number}      props.galleryId
 * @param {import('react').ReactNode} props.children
 */
export function ProofingModeProvider({ galleryId, children }) {
	const config = useModulaSettingsEditorConfig();
	const { canUseImageProofing } = useProofingGalleryCapabilities();

	const [isLocked, setIsLocked] = useState(() =>
		Boolean(config.lockedForProofing)
	);

	const lockMutation = useMutation({
		mutationFn: (lock) => {
			const api = getImageProofingEditorRegistration()?.api;
			if (typeof api?.setProofingGalleryLock !== 'function') {
				return Promise.resolve({ updated: false });
			}
			return api.setProofingGalleryLock(galleryId, lock);
		},
		onSuccess: (response, lock) => {
			if (!response?.updated) {
				return;
			}
			setIsLocked(Boolean(lock));
		},
	});

	const lock = useCallback(async () => {
		if (!canUseImageProofing || !galleryId) {
			return;
		}
		await lockMutation.mutateAsync(true);
	}, [canUseImageProofing, galleryId, lockMutation]);

	const unlock = useCallback(async () => {
		if (!canUseImageProofing || !galleryId) {
			return;
		}
		await lockMutation.mutateAsync(false);
	}, [canUseImageProofing, galleryId, lockMutation]);

	const value = useMemo(
		() => ({
			galleryId,
			isLocked,
			canUseImageProofing,
			isLockPending: lockMutation.isPending,
			lock,
			unlock,
		}),
		[
			galleryId,
			isLocked,
			canUseImageProofing,
			lockMutation.isPending,
			lock,
			unlock,
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
 *   lock: () => Promise<void>,
 *   unlock: () => Promise<void>,
 * }}
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
