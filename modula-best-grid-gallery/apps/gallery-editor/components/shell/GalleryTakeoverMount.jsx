/**
 * Mounts the takeover shell (code-split) with its providers.
 * A gallery in proofing keeps the takeover shell; Pro's proofing manager
 * opens over it as a modal.
 */
import { lazy, Suspense } from '@wordpress/element';
import {
	SettingsEditorErrorBoundary,
	SettingsEditorShellFallback,
	TakeoverSaveStatusProvider,
} from 'editor-shell';
import { TakeoverAuxiliaryPanelProvider } from '../../context/TakeoverAuxiliaryPanelContext';
import { SettingsPanelSectionsProvider } from '../../context/SettingsPanelSectionsContext';
import { GalleryTypeChangeProvider } from '../../context/GalleryTypeChangeContext';
import { LiteUpsellProvider } from '../../context/LiteUpsellContext';
import GalleryDefaultsEditorSlot from '../defaults/GalleryDefaultsEditorSlot';
import ProofingManagerSlot from '../proofing/ProofingManagerSlot';

const GalleryTakeoverShell = lazy(() => import('./GalleryTakeoverShell'));

export default function GalleryTakeoverMount() {
	/*
	 * Defaults Root (modals) must sit under TakeoverSaveStatusProvider so apply
	 * can serialize through runPersistTask with takeover autosave.
	 */
	return (
		<SettingsEditorErrorBoundary>
			<Suspense fallback={<SettingsEditorShellFallback />}>
				<TakeoverSaveStatusProvider>
					<TakeoverAuxiliaryPanelProvider>
						<SettingsPanelSectionsProvider>
							<GalleryTypeChangeProvider>
								<LiteUpsellProvider>
									<GalleryTakeoverShell />
								</LiteUpsellProvider>
							</GalleryTypeChangeProvider>
						</SettingsPanelSectionsProvider>
					</TakeoverAuxiliaryPanelProvider>
					<GalleryDefaultsEditorSlot slot="Root" />
					<ProofingManagerSlot />
				</TakeoverSaveStatusProvider>
			</Suspense>
		</SettingsEditorErrorBoundary>
	);
}
