/**
 * Compact AI generate control for Image edit sidebar fields.
 * Uses shared-ui Button `panel` + `mini` (watermark colours, 32px).
 */
import { __ } from '@wordpress/i18n';
import { Button } from 'shared-ui';
import ImageMetadataAiSparkleIcon from '../image-metadata-modal/ImageMetadataAiSparkleIcon';

/**
 * @param {Object} props
 * @param {boolean} props.busy
 * @param {() => void} props.onClick
 * @param {string} [props.ariaLabel]
 * @param {boolean} [props.block] Full-width panel CTA (section). Default false = inline.
 */
export default function GalleryItemAiGenerateButton({
	busy,
	onClick,
	ariaLabel = __('Generate', 'modula-best-grid-gallery'),
	block = false,
}) {
	return (
		<Button
			variant="panel"
			mini
			disabled={busy}
			className={
				block
					? 'modula-gallery-item-edit-panel__ai-btn'
					: 'modula-gallery-item-edit-panel__ai-btn modula-gallery-item-edit-panel__ai-btn--inline'
			}
			onClick={onClick}
			aria-label={ariaLabel}
		>
			<span
				className="modula-gallery-item-edit-panel__ai-btn-icon"
				aria-hidden="true"
			>
				<ImageMetadataAiSparkleIcon />
			</span>
			{busy
				? __('Generating…', 'modula-best-grid-gallery')
				: __('Generate', 'modula-best-grid-gallery')}
		</Button>
	);
}
