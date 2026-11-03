/**
 * Mounts Pro's proofing manager (Summary and Invitations) over the editor
 * while the gallery is locked for proofing and the manager is open. Pro owns
 * the modal and its data; Lite owns when it shows.
 */
import { useProofingMode } from '../../context/ProofingModeContext';
import { useImageProofingRegistration } from '../../hooks/useImageProofingRegistration';

export default function ProofingManagerSlot() {
	const { canUseImageProofing, isLocked, isManagerOpen } = useProofingMode();
	const registration = useImageProofingRegistration();
	const Modal = registration?.Modal;

	if (!canUseImageProofing || !isLocked || !isManagerOpen || !Modal) {
		return null;
	}

	return <Modal />;
}
