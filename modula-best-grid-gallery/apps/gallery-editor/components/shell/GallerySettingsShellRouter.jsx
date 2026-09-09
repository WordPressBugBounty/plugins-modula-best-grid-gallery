/**
 * Routes to the correct settings-editor shell (metabox, takeover, or proofing).
 * Each shell is code-split so only the active mode loads on first paint.
 * Proofing TakeoverShell is registered by Pro (never bundled in Lite).
 */
import { lazy, Suspense } from '@wordpress/element';
import { TakeoverAuxiliaryPanelProvider } from '../../context/TakeoverAuxiliaryPanelContext';
import { TakeoverSaveStatusProvider } from '../../context/TakeoverSaveStatusContext';
import { GalleryTypeChangeProvider } from '../../context/GalleryTypeChangeContext';
import { useModulaSettingsEditorConfig } from '../../hooks/useModulaSettingsEditorConfig';
import { useProofingMode } from '../../context/ProofingModeContext';
import { useProofingGalleryCapabilities } from '../../hooks/useProofingGalleryCapabilities';
import { useImageProofingRegistration } from '../../hooks/useImageProofingRegistration';
import GalleryDefaultsEditorSlot from '../defaults/GalleryDefaultsEditorSlot';
import SettingsEditorErrorBoundary from './SettingsEditorErrorBoundary';
import SettingsEditorShellFallback from './SettingsEditorShellFallback';

const SettingsEditorShell = lazy(() => import('./SettingsEditorShell'));
const GalleryTakeoverShell = lazy(() => import('./GalleryTakeoverShell'));

/**
 * @param {{ galleryId: number }} props
 */
export default function GallerySettingsShellRouter({ galleryId }) {
	const { takeover } = useModulaSettingsEditorConfig();

	if (!takeover) {
		return (
			<SettingsEditorErrorBoundary>
				<Suspense fallback={<SettingsEditorShellFallback />}>
					<SettingsEditorShell galleryId={galleryId} />
				</Suspense>
			</SettingsEditorErrorBoundary>
		);
	}

	return (
		<SettingsEditorErrorBoundary>
			<Suspense fallback={<SettingsEditorShellFallback />}>
				<GalleryTakeoverShellRouter />
			</Suspense>
		</SettingsEditorErrorBoundary>
	);
}

function GalleryTakeoverShellRouter() {
	const { canUseImageProofing } = useProofingGalleryCapabilities();
	const { isLocked } = useProofingMode();
	const registration = useImageProofingRegistration();
	const TakeoverShell = registration?.TakeoverShell;

	/*
	 * Defaults Root (modals) must sit under TakeoverSaveStatusProvider so apply
	 * can serialize through runPersistTask with takeover autosave.
	 */
	return (
		<TakeoverSaveStatusProvider>
			{isLocked && canUseImageProofing && TakeoverShell ? (
				<TakeoverShell />
			) : (
				<TakeoverAuxiliaryPanelProvider>
					<GalleryTypeChangeProvider>
						<GalleryTakeoverShell />
					</GalleryTypeChangeProvider>
				</TakeoverAuxiliaryPanelProvider>
			)}
			<GalleryDefaultsEditorSlot slot="Root" />
		</TakeoverSaveStatusProvider>
	);
}
