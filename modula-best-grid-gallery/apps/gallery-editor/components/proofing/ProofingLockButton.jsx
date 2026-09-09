/**
 * Lock gallery for image proofing — shared by metabox nested panel and redesign SettingsPanel.
 */
import { __ } from '@wordpress/i18n';
import { Button } from 'shared-ui';
import { useModulaSettingsEditorConfig } from '../../hooks/useModulaSettingsEditorConfig';
import { useProofingMode } from '../../context/ProofingModeContext';
import { useProofingGalleryCapabilities } from '../../hooks/useProofingGalleryCapabilities';
import { useGalleryBootstrapQuery } from '../../query/useGalleryBootstrapQuery';

/**
 * @return {boolean}
 */
export function isProofingNestedFrame(frame) {
	return Boolean(
		frame?.groupedPaths?.some(
			(p) => typeof p === 'string' && p.startsWith('proofing.')
		)
	);
}

/**
 * Lock CTA shown on Advanced → Image proofing nested drill.
 */
export default function ProofingLockButton() {
	const config = useModulaSettingsEditorConfig();
	const { canUseImageProofing } = useProofingGalleryCapabilities();
	const { lock, isLockPending, isLocked } = useProofingMode();
	const galleryId = config.galleryId ? Number(config.galleryId) : 0;
	const { data: bootstrap } = useGalleryBootstrapQuery(
		config.takeover ? galleryId : null
	);
	const hasImages =
		Array.isArray(bootstrap?.items) && bootstrap.items.length > 0;

	if (!canUseImageProofing || isLocked) {
		return null;
	}

	return (
		<div className="modula-settings-editor__proofing-lock-placeholder">
			<Button
				type="button"
				variant="ghost"
				className="modula-settings-editor__proofing-lock-placeholder-btn"
				onClick={() => lock()}
				disabled={isLockPending || !hasImages}
			>
				{isLockPending
					? __('Locking…', 'modula-best-grid-gallery')
					: __(
							'Lock gallery for proofing',
							'modula-best-grid-gallery'
						)}
			</Button>
			<p className="modula-settings-editor__proofing-lock-hint">
				{__(
					'Lock the gallery to open invitations, summary, and proofing settings.',
					'modula-best-grid-gallery'
				)}
			</p>
			{!hasImages ? (
				<p className="modula-settings-editor__proofing-lock-hint">
					{__(
						'Add images to the gallery before locking for proofing.',
						'modula-best-grid-gallery'
					)}
				</p>
			) : null}
		</div>
	);
}
