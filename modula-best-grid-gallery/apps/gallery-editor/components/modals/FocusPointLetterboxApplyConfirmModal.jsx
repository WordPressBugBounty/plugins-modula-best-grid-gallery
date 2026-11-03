/**
 * Confirm applying letterbox to all gallery images after saving one tile.
 */
import { __, sprintf } from '@wordpress/i18n';
import { ConfirmDialog } from 'admin-ui';

/**
 * @param {Object}     props
 * @param {boolean}    props.isOpen
 * @param {number}     props.otherCount      Number of other images that would receive letterbox.
 * @param {() => void} props.onCancel
 * @param {() => void} props.onApplyThisOnly
 * @param {() => void} props.onApplyAll
 */
export default function FocusPointLetterboxApplyConfirmModal({
	isOpen,
	otherCount,
	onCancel,
	onApplyThisOnly,
	onApplyAll,
}) {
	return (
		<ConfirmDialog
			open={isOpen}
			title={__(
				'Apply letterbox to other images?',
				'modula-best-grid-gallery'
			)}
			message={sprintf(
				/* translators: %d: number of other gallery images */
				__(
					'Apply letterbox to all %d other images in this gallery? They will show the full photo inside each tile, using the same alignment as this image.',
					'modula-best-grid-gallery'
				),
				Math.max(0, Number(otherCount) || 0)
			)}
			confirmVariant="primary"
			confirmLabel={__('All images', 'modula-best-grid-gallery')}
			onConfirm={onApplyAll}
			secondaryLabel={__('This image only', 'modula-best-grid-gallery')}
			onSecondary={onApplyThisOnly}
			onCancel={onCancel}
		/>
	);
}
