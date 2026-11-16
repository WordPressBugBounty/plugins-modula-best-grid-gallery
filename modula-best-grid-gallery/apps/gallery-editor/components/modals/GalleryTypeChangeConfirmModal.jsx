/**
 * Confirm clearing per-image focus when changing gallery layout.
 */
import { __ } from '@wordpress/i18n';
import { ConfirmDialog } from 'admin-ui';
import { AdminUiScope } from 'editor-shell';

/**
 * @param {Object}     props
 * @param {boolean}    props.isOpen
 * @param {() => void} props.onCancel
 * @param {() => void} props.onConfirm
 */
export default function GalleryTypeChangeConfirmModal({
	isOpen,
	onCancel,
	onConfirm,
}) {
	return (
		<AdminUiScope>
			<ConfirmDialog
				open={isOpen}
				title={__('Change gallery layout?', 'modula-best-grid-gallery')}
				message={__(
					'Changing the gallery layout will remove image focus (focal point and crop) from all images.',
					'modula-best-grid-gallery'
				)}
				confirmLabel={__('Continue', 'modula-best-grid-gallery')}
				confirmVariant="primary"
				onConfirm={onConfirm}
				onCancel={onCancel}
			/>
		</AdminUiScope>
	);
}
