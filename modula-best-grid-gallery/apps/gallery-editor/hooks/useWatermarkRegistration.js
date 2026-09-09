import { useEffect, useState } from '@wordpress/element';
import { getWatermarkEditorRegistration } from '../platform/watermarkRegistry';

/**
 * Subscribe to Pro runtime registration of watermark UI.
 *
 * @returns {import('../platform/watermarkRegistry').WatermarkEditorRegistration|null}
 */
export function useWatermarkRegistration() {
	const [registration, setRegistration] = useState(() =>
		getWatermarkEditorRegistration()
	);

	useEffect(() => {
		const sync = () => setRegistration(getWatermarkEditorRegistration());
		window.addEventListener('modulaWatermarkRegistered', sync);
		return () =>
			window.removeEventListener('modulaWatermarkRegistered', sync);
	}, []);

	return registration;
}
