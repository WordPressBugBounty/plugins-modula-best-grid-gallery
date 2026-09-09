import { useEffect, useState } from '@wordpress/element';
import { getPaginationEditorRegistration } from '../platform/paginationRegistry';

/**
 * Subscribe to Pro runtime registration of pagination preview UI.
 *
 * @returns {import('../platform/paginationRegistry').PaginationEditorRegistration|null}
 */
export function usePaginationRegistration() {
	const [registration, setRegistration] = useState(() =>
		getPaginationEditorRegistration()
	);

	useEffect(() => {
		const sync = () => setRegistration(getPaginationEditorRegistration());
		window.addEventListener('modulaPaginationRegistered', sync);
		return () =>
			window.removeEventListener('modulaPaginationRegistered', sync);
	}, []);

	return registration;
}
