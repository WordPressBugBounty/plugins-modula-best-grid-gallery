/**
 * Compact AI generate control beside an Image edit field label.
 */
import { __ } from '@wordpress/i18n';
import { Button } from 'admin-ui';
import ImageMetadataAiSparkleIcon from '../image-metadata-modal/ImageMetadataAiSparkleIcon';

/**
 * @param {Object}     props
 * @param {boolean}    props.busy
 * @param {() => void} props.onClick
 * @param {string}     [props.ariaLabel]
 */
export default function GalleryItemAiGenerateButton({
	busy,
	onClick,
	ariaLabel = __('Generate', 'modula-best-grid-gallery'),
}) {
	return (
		<Button
			variant="ghost"
			icon={<ImageMetadataAiSparkleIcon />}
			disabled={busy}
			className="modula-gallery-item-edit-panel__ai-field-button"
			onClick={onClick}
			aria-label={ariaLabel}
		>
			{busy
				? __('Generating…', 'modula-best-grid-gallery')
				: __('Generate', 'modula-best-grid-gallery')}
		</Button>
	);
}
