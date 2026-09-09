/**
 * Confirm clearing per-image focus when changing gallery layout.
 */
import { __ } from '@wordpress/i18n';
import { Button } from 'shared-ui';
import GalleryModal from '../gallery-modal/GalleryModal';

/**
 * @param {Object}     props
 * @param {boolean}    props.isOpen
 * @param {boolean}    props.isBusy
 * @param {() => void} props.onCancel
 * @param {() => void} props.onConfirm
 */
export default function GalleryTypeChangeConfirmModal({
	isOpen,
	isBusy,
	onCancel,
	onConfirm,
}) {
	return (
		<GalleryModal
			isOpen={isOpen}
			onClose={onCancel}
			size="small"
			titleId="modula-gallery-type-confirm-title"
			title={__('Change gallery layout?', 'modula-best-grid-gallery')}
			className="modula-settings-editor-confirm-modal"
			panelClassName="modula-settings-editor-confirm-modal__panel"
			bodyClassName="modula-settings-editor-confirm-modal__body"
			closeOnBackdropClick={!isBusy}
			showClose={!isBusy}
			footerRight={
				<>
					<Button
						variant="plain"
						className="modula-gallery-modal__footer-cancel"
						onClick={onCancel}
						disabled={isBusy}
					>
						{__('Cancel', 'modula-best-grid-gallery')}
					</Button>
					<Button
						variant="primary"
						className="modula-gallery-modal__footer-primary"
						onClick={onConfirm}
						disabled={isBusy}
					>
						{isBusy
							? __('Working…', 'modula-best-grid-gallery')
							: __('Continue', 'modula-best-grid-gallery')}
					</Button>
				</>
			}
		>
			<p className="modula-settings-editor-confirm-modal__message">
				{__(
					'Changing the gallery layout will remove image focus (focal point and crop) from all images.',
					'modula-best-grid-gallery'
				)}
			</p>
		</GalleryModal>
	);
}
