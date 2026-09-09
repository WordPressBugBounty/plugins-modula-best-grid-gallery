/**
 * Bottom action bar for the gallery item edit modal.
 */
import { __ } from '@wordpress/i18n';
import { Button } from '@wordpress/components';
import GalleryModalFooter from '../gallery-modal/GalleryModalFooter';

/**
 * @param {Object}     props
 * @param {boolean}    props.canReset
 * @param {boolean}    props.saveBusy
 * @param {boolean}    props.disabled
 * @param {() => void} props.onReset
 * @param {() => void} props.onCancel
 * @param {() => void} props.onSave
 * @param {() => void} props.onSaveAndClose
 * @param {boolean}    [props.isDirty]
 */
export default function ImageMetadataModalFooter({
	canReset,
	saveBusy,
	disabled,
	onReset,
	onCancel,
	onSave,
	onSaveAndClose,
	isDirty = false,
}) {
	return (
		<GalleryModalFooter
			left={
				<Button
					variant="link"
					className="modula-gallery-modal__footer-link"
					onClick={onReset}
					disabled={!canReset || disabled || saveBusy}
				>
					{__('Reset changes', 'modula-best-grid-gallery')}
				</Button>
			}
			right={
				<>
					<Button
						variant="tertiary"
						className="modula-gallery-modal__footer-cancel"
						onClick={onCancel}
						disabled={saveBusy}
					>
						{__('Cancel', 'modula-best-grid-gallery')}
					</Button>
					<Button
						variant="primary"
						className="modula-gallery-modal__footer-primary"
						onClick={onSave}
						isBusy={saveBusy}
						disabled={disabled || (!isDirty && !saveBusy)}
					>
						{__('Save', 'modula-best-grid-gallery')}
					</Button>
					<Button
						variant="secondary"
						className="modula-gallery-modal__footer-save-close"
						onClick={onSaveAndClose}
						isBusy={saveBusy}
						disabled={disabled}
					>
						{__('Save and close', 'modula-best-grid-gallery')}
					</Button>
				</>
			}
		/>
	);
}
