/**
 * Confirm applying letterbox to all gallery images after saving one tile.
 */
import { useCallback } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { Button } from '@wordpress/components';
import GalleryModal from '../gallery-modal/GalleryModal';

/**
 * @param {Object}     props
 * @param {boolean}    props.isOpen
 * @param {boolean}    props.isBusy
 * @param {number}     props.otherCount Number of other images that would receive letterbox.
 * @param {() => void} props.onCancel
 * @param {() => void} props.onApplyThisOnly
 * @param {() => void} props.onApplyAll
 */
export default function FocusPointLetterboxApplyConfirmModal({
	isOpen,
	isBusy,
	otherCount,
	onCancel,
	onApplyThisOnly,
	onApplyAll,
}) {
	const focusPrimaryButton = useCallback((node) => {
		node?.focus();
	}, []);

	return (
		<GalleryModal
			isOpen={isOpen}
			onClose={onCancel}
			size="small"
			titleId="modula-focus-letterbox-apply-confirm-title"
			title={__(
				'Apply letterbox to other images?',
				'modula-best-grid-gallery'
			)}
			className="modula-settings-editor-confirm-modal"
			panelClassName="modula-settings-editor-confirm-modal__panel"
			bodyClassName="modula-settings-editor-confirm-modal__body"
			closeOnBackdropClick={!isBusy}
			showClose={!isBusy}
			footerRight={
				<>
					<Button
						variant="tertiary"
						className="modula-gallery-modal__footer-cancel"
						onClick={onCancel}
						disabled={isBusy}
					>
						{__('Cancel', 'modula-best-grid-gallery')}
					</Button>
					<Button
						variant="secondary"
						className="modula-gallery-modal__footer-secondary"
						onClick={onApplyThisOnly}
						disabled={isBusy}
						isBusy={isBusy}
					>
						{__('This image only', 'modula-best-grid-gallery')}
					</Button>
					<Button
						ref={focusPrimaryButton}
						variant="primary"
						className="modula-gallery-modal__footer-primary"
						onClick={onApplyAll}
						disabled={isBusy}
						isBusy={isBusy}
					>
						{__('All images', 'modula-best-grid-gallery')}
					</Button>
				</>
			}
		>
			<p className="modula-settings-editor-confirm-modal__message">
				{sprintf(
					/* translators: %d: number of other gallery images */
					__(
						'Apply letterbox to all %d other images in this gallery? They will show the full photo inside each tile, using the same alignment as this image.',
						'modula-best-grid-gallery'
					),
					Math.max(0, Number(otherCount) || 0)
				)}
			</p>
		</GalleryModal>
	);
}
