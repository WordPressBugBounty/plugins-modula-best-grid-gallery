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
import { GalleryItemEditSidebarProvider } from '../../context/GalleryItemEditSidebarContext';
import { useGalleryBootstrapQuery } from '../../query/useGalleryBootstrapQuery';
import GalleryTakeoverMount from './GalleryTakeoverMount';
import { useGallerySettingsUndoRedoShortcuts } from '../../hooks/useGallerySettingsUndoRedoShortcuts';
import { useHoverDimOverlaySync } from '../../hooks/useHoverDimOverlaySync';
import { useHoverColorOpacitySync } from '../../hooks/useHoverColorOpacitySync';
import { useMotionHoverChoiceSync } from '../../hooks/useMotionHoverChoiceSync';
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

function MotionHoverChoiceSyncMount() {
	const { form } = useGallerySettingsFormBundle();
	useMotionHoverChoiceSync(form);
	return null;
}

export default function GallerySettingsEditorLoaded({
	galleryId,
	groupedPayload,
}) {
	const bundle = useGallerySettingsForm(groupedPayload, galleryId);
	/* Warm bootstrap cache for takeover as soon as settings load (declarative fetch, no prefetch effect). */
	useGalleryBootstrapQuery(galleryId);

	return (
		<GallerySettingsFormProvider value={bundle}>
			<ProofingModeProvider galleryId={galleryId}>
				<GallerySettingsUndoRedoShortcutsMount />
				<HoverDimOverlaySyncMount />
				<HoverColorOpacitySyncMount />
				<MotionHoverChoiceSyncMount />
				<TakeoverSidebarStackProvider>
					<GalleryPreviewTileSelectionProvider>
						<GalleryItemEditSidebarProvider>
							<WatermarkPreviewSelectionProvider>
								<GalleryTakeoverMount />
							</WatermarkPreviewSelectionProvider>
						</GalleryItemEditSidebarProvider>
					</GalleryPreviewTileSelectionProvider>
				</TakeoverSidebarStackProvider>
			</ProofingModeProvider>
		</GallerySettingsFormProvider>
	);
}
