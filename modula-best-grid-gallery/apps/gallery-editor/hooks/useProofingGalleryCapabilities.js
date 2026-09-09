import { useMemo } from '@wordpress/element';
import { useModulaSettingsEditorConfig } from './useModulaSettingsEditorConfig';

/**
 * Whether Image Proofing takeover UI and lock controls are available on this screen.
 *
 * @return {{ canUseImageProofing: boolean, imageProofingExtensionActive: boolean }}
 */
export function useProofingGalleryCapabilities() {
	const config = useModulaSettingsEditorConfig();

	return useMemo(() => {
		const isPro = Boolean(config.isPro);
		const extensionActive = Boolean(config.imageProofingExtensionActive);
		return {
			canUseImageProofing: isPro && extensionActive,
			imageProofingExtensionActive: extensionActive,
		};
	}, [config.isPro, config.imageProofingExtensionActive]);
}
