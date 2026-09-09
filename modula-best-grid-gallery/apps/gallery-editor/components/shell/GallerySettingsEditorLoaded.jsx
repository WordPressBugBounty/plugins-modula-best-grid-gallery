/**
 * Mounts TanStack Form provider after REST payload is ready.
 */

import {
	GallerySettingsFormProvider,
	useGallerySettingsFormBundle,
} from '../../form/GallerySettingsFormContext';
import { useGallerySettingsForm } from '../../form/useGallerySettingsForm';
import { TakeoverSidebarStackProvider } from '../../context/TakeoverSidebarStackContext';
import { WatermarkPreviewSelectionProvider } from '../../context/WatermarkPreviewSelectionContext';
import { GalleryPreviewTileSelectionProvider } from '../../context/GalleryPreviewTileSelectionContext';
import { GalleryReorderSidebarProvider } from '../../context/GalleryReorderSidebarContext';
import { GalleryItemEditSidebarProvider } from '../../context/GalleryItemEditSidebarContext';
import { useModulaSettingsEditorConfig } from '../../hooks/useModulaSettingsEditorConfig';
import { useGalleryBootstrapQuery } from '../../query/useGalleryBootstrapQuery';
import GallerySettingsShellRouter from './GallerySettingsShellRouter';
import { useGallerySettingsUndoRedoShortcuts } from '../../hooks/useGallerySettingsUndoRedoShortcuts';
import { useHoverDimOverlaySync } from '../../hooks/useHoverDimOverlaySync';
import { useHoverColorOpacitySync } from '../../hooks/useHoverColorOpacitySync';
import { ProofingModeProvider } from '../../context/ProofingModeContext';

function GallerySettingsUndoRedoShortcutsMount() {
	useGallerySettingsUndoRedoShortcuts();
	return null;
}

function HoverDimOverlaySyncMount() {
	const { form } = useGallerySettingsFormBundle();
	useHoverDimOverlaySync(form);
	return null;
}

function HoverColorOpacitySyncMount() {
	const { form } = useGallerySettingsFormBundle();
	useHoverColorOpacitySync(form);
	return null;
}

export default function GallerySettingsEditorLoaded({
	galleryId,
	groupedPayload,
}) {
	const bundle = useGallerySettingsForm(groupedPayload, galleryId);
	const { takeover } = useModulaSettingsEditorConfig();

	/* Warm bootstrap cache for takeover as soon as settings load (declarative fetch, no prefetch effect). */
	useGalleryBootstrapQuery(takeover ? galleryId : null);

	return (
		<GallerySettingsFormProvider value={bundle}>
			<ProofingModeProvider galleryId={galleryId}>
				<GallerySettingsUndoRedoShortcutsMount />
				<HoverDimOverlaySyncMount />
				<HoverColorOpacitySyncMount />
				<TakeoverSidebarStackProvider>
					<GalleryPreviewTileSelectionProvider>
						<GalleryReorderSidebarProvider>
							<GalleryItemEditSidebarProvider>
								<WatermarkPreviewSelectionProvider>
									<GallerySettingsShellRouter
										galleryId={galleryId}
									/>
								</WatermarkPreviewSelectionProvider>
							</GalleryItemEditSidebarProvider>
						</GalleryReorderSidebarProvider>
					</GalleryPreviewTileSelectionProvider>
				</TakeoverSidebarStackProvider>
			</ProofingModeProvider>
		</GallerySettingsFormProvider>
	);
}
