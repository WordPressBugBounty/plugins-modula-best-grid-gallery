import { useEffect, useState } from '@wordpress/element';
import { getImageProofingEditorRegistration } from '../platform/imageProofingRegistry';

/**
 * Subscribe to Pro runtime registration of image-proofing UI slots.
 *
 * @returns {import('../platform/imageProofingRegistry').ImageProofingEditorRegistration|null}
 */
export function useImageProofingRegistration() {
	const [registration, setRegistration] = useState(() =>
		getImageProofingEditorRegistration()
	);

	useEffect(() => {
		const sync = () =>
			setRegistration(getImageProofingEditorRegistration());
		window.addEventListener('modulaImageProofingRegistered', sync);
		return () =>
			window.removeEventListener('modulaImageProofingRegistered', sync);
	}, []);

	return registration;
}
