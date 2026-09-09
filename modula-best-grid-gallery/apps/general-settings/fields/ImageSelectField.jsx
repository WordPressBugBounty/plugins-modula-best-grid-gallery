import { useState } from '@wordpress/element';
import { Button } from '@wordpress/components';
import Label from './Label';
import styles from './ImageSelectField.module.scss';

export default function ImageSelector({ fieldState, field, handleChange }) {
	const [imageSrc, setImageSrc] = useState(field.src || null);

	const openMediaLibrary = () => {
		const mediaFrame = wp.media({
			title: field.mediaTitle || 'Select an image',
			button: {
				text: field.mediaButtonText || 'Use this image',
			},
			multiple: false,
		});
		mediaFrame.on('select', () => {
			const selection = mediaFrame
				.state()
				.get('selection')
				.first()
				.toJSON();
			const attachmentId = selection.id;
			const attachmentSrc = selection.url;

			handleChange(attachmentId);
			setImageSrc(attachmentSrc);
		});

		mediaFrame.open();
	};

	const removeImage = () => {
		handleChange(null);
		setImageSrc(null);
	};

	return (
		<div className={styles.imageSelectField}>
			<Label label={field.label} description={field.description} />
			<div className={styles.imageContainer}>
				{imageSrc ? (
					<>
						<div className={styles.imagePreview}>
							<img
								src={imageSrc}
								alt={field.label || 'Selected image'}
							/>
						</div>
						<div className={styles.imageActions}>
							<Button
								variant="secondary"
								onClick={openMediaLibrary}
							>
								Replace
							</Button>
							<Button
								isDestructive
								variant="link"
								onClick={removeImage}
							>
								Remove
							</Button>
						</div>
					</>
				) : (
					<div className={styles.uploadPlaceholder}>
						<Button variant="primary" onClick={openMediaLibrary}>
							{field.uploadButtonText ||
								field.buttonText ||
								'Select image'}
						</Button>
					</div>
				)}
			</div>
		</div>
	);
}
