/**
 * Mounts the takeover shell (code-split) with its providers.
 * A gallery in proofing keeps the takeover shell; Pro's proofing manager
 * opens over it as a modal.
 */
import { lazy, Suspense, useState } from '@wordpress/element';
import {
	EditorSaveSessionProvider,
	SettingsEditorErrorBoundary,
	SettingsEditorShellFallback,
	TakeoverSaveStatusProvider,
} from 'editor-shell';
import { getModulaSettingsEditorConfig } from '../../config/modulaSettingsEditorConfig';
import { resolveGalleryAdminPostId } from '../../utils/resolveGalleryAdminPostId';
import {
	GALLERY_FIRST_SAVE_ORDER,
	GALLERY_SAVE_ORDER,
} from '../../constants/gallerySaveParts';
import { createEditorPostFields } from 'editor-shell/logic';
import { GalleryPostFieldsContext } from '../../context/GalleryPostFieldsContext';
import { TakeoverAuxiliaryPanelProvider } from '../../context/TakeoverAuxiliaryPanelContext';
import { SettingsPanelSectionsProvider } from '../../context/SettingsPanelSectionsContext';
import { GalleryTypeChangeProvider } from '../../context/GalleryTypeChangeContext';
import { LiteUpsellProvider } from '../../context/LiteUpsellContext';
import GalleryDefaultsEditorSlot from '../defaults/GalleryDefaultsEditorSlot';
import ProofingManagerSlot from '../proofing/ProofingManagerSlot';

const GalleryTakeoverShell = lazy(() => import('./GalleryTakeoverShell'));

/**
 * The gallery's title and status from the editor config. A new gallery
 * carries `postFirstSave`, what its first editor save stores without edits.
 *
 * @return {ReturnType<typeof createEditorPostFields>} The editor's post fields.
 */
function createPostFieldsFromConfig() {
	const config = getModulaSettingsEditorConfig() || {};
	const firstSave = config.postFirstSave;
	return createEditorPostFields({
		title: config.postTitle || '',
		status: config.postStatus || '',
		statusLabel: config.postStatusLabel || '',
		statusChoices: config.postStatusChoices || [],
		firstSave:
			firstSave && typeof firstSave === 'object' ? firstSave : null,
	});
}

/**
 * The gallery's recovery copy (ADR 0059): one per gallery, site and user,
 * compared with the stored state's marker from the editor config.
 *
 * @return {import('editor-shell/recovery/EditorRecoveryCopy').EditorRecoveryOptions|null} Null without a gallery id.
 */
function recoveryFromConfig() {
	const config = getModulaSettingsEditorConfig() || {};
	const galleryId = resolveGalleryAdminPostId(config);
	if (!galleryId) {
		return null;
	}
	const owner = config.recoveryIdentity || {};
	return {
		identity: {
			site: owner.site,
			user: owner.user,
			documentType: 'gallery',
			documentId: galleryId,
		},
		savedState:
			typeof config.savedState === 'string' ? config.savedState : null,
	};
}

export default function GalleryTakeoverMount() {
	const [postFields] = useState(createPostFieldsFromConfig);
	const [recovery] = useState(recoveryFromConfig);

	/*
	 * The first save is decided live: the post fields know whether the gallery
	 * is still an auto-draft (until its first editor save takes it out).
	 */
	return (
		<SettingsEditorErrorBoundary>
			<Suspense fallback={<SettingsEditorShellFallback />}>
				<TakeoverSaveStatusProvider>
					<EditorSaveSessionProvider
						order={GALLERY_SAVE_ORDER}
						firstSaveOrder={GALLERY_FIRST_SAVE_ORDER}
						isFirstSave={postFields.isNeverSaved}
						recovery={recovery}
					>
						<GalleryPostFieldsContext.Provider value={postFields}>
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
						</GalleryPostFieldsContext.Provider>
					</EditorSaveSessionProvider>
				</TakeoverSaveStatusProvider>
			</Suspense>
		</SettingsEditorErrorBoundary>
	);
}
