import { useEffect, useState } from '@wordpress/element';
import { getProCoreEditorRegistration } from '../platform/proCoreRegistry';

/**
 * Subscribe to Pro runtime registration of pro-core UI slots.
 *
 * @returns {import('../platform/proCoreRegistry').ProCoreEditorRegistration|null}
 */
export function useProCoreRegistration() {
	const [registration, setRegistration] = useState(() =>
		getProCoreEditorRegistration()
	);

	useEffect(() => {
		const sync = () => setRegistration(getProCoreEditorRegistration());
		window.addEventListener('modulaProCoreRegistered', sync);
		return () =>
			window.removeEventListener('modulaProCoreRegistered', sync);
	}, []);

	return registration;
}
