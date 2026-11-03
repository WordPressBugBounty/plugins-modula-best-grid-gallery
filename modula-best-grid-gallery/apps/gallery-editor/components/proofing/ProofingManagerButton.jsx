/**
 * The last row of the Client proofing options (`proofing.manageProofing`):
 * locks the gallery for proofing and opens Pro's proofing manager, or opens
 * the manager of a gallery that is already locked. The label follows the
 * lock state, so the schema's `buttonLabel` is not used.
 */
import { __ } from '@wordpress/i18n';
import { Button } from 'admin-ui';
import { useProofingMode } from '../../context/ProofingModeContext';
import { useGalleryImageCount } from '../../hooks/useGalleryImageCount';

/**
 * @param {{ disabled?: boolean }} props
 */
export default function ProofingManagerButton({ disabled = false }) {
	const {
		canUseImageProofing,
		isLocked,
		isLockPending,
		lockFailed,
		openManager,
	} = useProofingMode();
	const imageCount = useGalleryImageCount();

	if (!canUseImageProofing) {
		return null;
	}

	const hasImages = imageCount.count > 0;
	const canLock = hasImages && !isLockPending;

	let label = __('Open proofing', 'modula-best-grid-gallery');
	if (!isLocked) {
		label = isLockPending
			? __('Locking…', 'modula-best-grid-gallery')
			: __('Lock gallery for proofing', 'modula-best-grid-gallery');
	}

	return (
		<div className="modula-settings-editor__action-button-wrap">
			<Button
				onClick={openManager}
				disabled={disabled || (!isLocked && !canLock)}
			>
				{label}
			</Button>
			{!isLocked && imageCount.isKnown && !hasImages ? (
				<p className="modula-settings-editor__action-button-hint">
					{__(
						'Add images to the gallery before locking it for proofing.',
						'modula-best-grid-gallery'
					)}
				</p>
			) : null}
			{lockFailed ? (
				<p
					className="modula-settings-editor__action-button-hint modula-settings-editor__action-button-hint--error"
					role="alert"
				>
					{__(
						'The gallery could not be locked for proofing. Try again.',
						'modula-best-grid-gallery'
					)}
				</p>
			) : null}
		</div>
	);
}
