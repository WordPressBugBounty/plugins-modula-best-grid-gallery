/**
 * Subscribes to Pro Instagram editor registration.
 */
import { useEffect, useState } from '@wordpress/element';
import { getInstagramEditorRegistration } from '../platform/instagramRegistry';

/**
 * @returns {import('../platform/instagramRegistry').InstagramEditorRegistration|null}
 */
export function useInstagramRegistration() {
	const [registration, setRegistration] = useState(() =>
		getInstagramEditorRegistration()
	);

	useEffect(() => {
		const sync = () => setRegistration(getInstagramEditorRegistration());
		window.addEventListener('modulaInstagramRegistered', sync);
		return () =>
			window.removeEventListener('modulaInstagramRegistered', sync);
	}, []);

	return registration;
}
