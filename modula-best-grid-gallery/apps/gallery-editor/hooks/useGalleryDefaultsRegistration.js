import { useEffect, useState } from '@wordpress/element';
import { getGalleryDefaultsEditorRegistration } from '../platform/galleryDefaultsRegistry';

/**
 * Subscribe to Pro runtime registration of gallery defaults UI slots.
 *
 * @returns {import('../platform/galleryDefaultsRegistry').GalleryDefaultsEditorRegistration|null}
 */
export function useGalleryDefaultsRegistration() {
	const [registration, setRegistration] = useState(() =>
		getGalleryDefaultsEditorRegistration()
	);

	useEffect(() => {
		const sync = () =>
			setRegistration(getGalleryDefaultsEditorRegistration());
		window.addEventListener('modulaGalleryDefaultsRegistered', sync);
		return () =>
			window.removeEventListener('modulaGalleryDefaultsRegistered', sync);
	}, []);

	return registration;
}
