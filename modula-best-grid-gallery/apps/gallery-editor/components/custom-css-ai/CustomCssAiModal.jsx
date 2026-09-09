import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import {
	Button,
	Notice,
	RadioControl,
	Spinner,
	TextareaControl,
} from '@wordpress/components';
import GalleryModal from '../gallery-modal/GalleryModal';
import ImageMetadataAiSparkleIcon from '../image-metadata-modal/ImageMetadataAiSparkleIcon';
import '../../styles/takeover/preview/_custom-css-ai-modal.scss';
import { useModulaSettingsEditorConfig } from '../../hooks/useModulaSettingsEditorConfig';
import { useGenerateCustomCssMutation } from '../../query/useGenerateCustomCssMutation';

/**
 * @param {Object}   props
 * @param {boolean}  props.isOpen
 * @param {() => void} props.onClose
 * @param {string}   props.currentCss
 * @param {(nextCss: string) => void} props.onApply
 */
export default function CustomCssAiModal({
	isOpen,
	onClose,
	currentCss,
	onApply,
}) {
	const editor = useModulaSettingsEditorConfig();
	const galleryId = Number(editor.galleryId) || 0;
	const mutation = useGenerateCustomCssMutation(galleryId);

	const [prompt, setPrompt] = useState('');
	const [applyMode, setApplyMode] = useState(
		/** @type {'replace'|'append'} */ ('replace')
	);
	const [preview, setPreview] = useState(
		/** @type {{ code: string, summary: string, warnings: string[] } | null} */ (
			null
		)
	);
	const [error, setError] = useState('');

	const resetState = () => {
		setPrompt('');
		setApplyMode('replace');
		setPreview(null);
		setError('');
	};

	const handleClose = () => {
		if (mutation.isPending) {
			return;
		}
		resetState();
		onClose();
	};

	const handleGenerate = async () => {
		const trimmed = prompt.trim();
		if (!trimmed || !galleryId) {
			return;
		}

		setError('');
		setPreview(null);

		try {
			const result = await mutation.mutateAsync(trimmed);
			const code =
				typeof result?.code === 'string' ? result.code.trim() : '';
			if (!code) {
				setError(
					typeof result?.summary === 'string' && result.summary !== ''
						? result.summary
						: __(
								'No CSS was generated. Try a more specific prompt.',
								'modula-best-grid-gallery'
							)
				);
				return;
			}

			setPreview({
				code,
				summary:
					typeof result?.summary === 'string'
						? result.summary.trim()
						: '',
				warnings: Array.isArray(result?.warnings)
					? result.warnings.filter(
							(item) =>
								typeof item === 'string' && item.trim() !== ''
						)
					: [],
			});
		} catch (e) {
			const message =
				e?.message ||
				__(
					'Custom CSS generation failed. Please try again.',
					'modula-best-grid-gallery'
				);
			setError(message);
		}
	};

	const handleApply = () => {
		if (!preview?.code) {
			return;
		}

		const existing = String(currentCss || '').trim();
		const next =
			applyMode === 'append' && existing
				? `${existing}\n\n${preview.code}`
				: preview.code;

		onApply(next);
		handleClose();
	};

	return (
		<GalleryModal
			isOpen={isOpen}
			onClose={handleClose}
			size="medium"
			className="modula-custom-css-ai-modal"
			panelClassName="modula-custom-css-ai-modal__panel"
			bodyClassName="modula-custom-css-ai-modal__body"
			title={__('Generate custom CSS', 'modula-best-grid-gallery')}
			subtitle={__(
				'Scoped to this gallery only',
				'modula-best-grid-gallery'
			)}
			iconElement={<ImageMetadataAiSparkleIcon />}
			footerRight={
				<>
					<Button
						variant="tertiary"
						onClick={handleClose}
						disabled={mutation.isPending}
					>
						{__('Cancel', 'modula-best-grid-gallery')}
					</Button>
					{preview ? (
						<>
							<Button
								variant="secondary"
								onClick={handleGenerate}
								disabled={mutation.isPending}
								isBusy={mutation.isPending}
							>
								{__('Regenerate', 'modula-best-grid-gallery')}
							</Button>
							<Button variant="primary" onClick={handleApply}>
								{__('Apply CSS', 'modula-best-grid-gallery')}
							</Button>
						</>
					) : (
						<Button
							variant="primary"
							onClick={handleGenerate}
							disabled={
								!prompt.trim() ||
								mutation.isPending ||
								!galleryId
							}
							isBusy={mutation.isPending}
						>
							{__('Generate', 'modula-best-grid-gallery')}
						</Button>
					)}
				</>
			}
		>
			<div className="modula-custom-css-ai">
				<p className="modula-custom-css-ai__intro">
					{__(
						'Describe the style you want. Generated rules use this gallery’s selectors and stay inside its wrapper.',
						'modula-best-grid-gallery'
					)}
				</p>

				<div className="modula-custom-css-ai__prompt-card">
					<p
						id="modula-custom-css-ai-prompt-label"
						className="modula-custom-css-ai__prompt-label"
					>
						{__('What should change?', 'modula-best-grid-gallery')}
					</p>
					<p className="modula-custom-css-ai__prompt-hint">
						{__(
							'Example: round image corners, softer tile shadow, larger title on hover.',
							'modula-best-grid-gallery'
						)}
					</p>
					<TextareaControl
						__next40pxDefaultSize
						hideLabelFromVision
						label={__(
							'What should change?',
							'modula-best-grid-gallery'
						)}
						aria-labelledby="modula-custom-css-ai-prompt-label"
						value={prompt}
						onChange={setPrompt}
						rows={5}
						disabled={mutation.isPending}
						className="modula-custom-css-ai__prompt-input"
					/>
				</div>

				{mutation.isPending ? (
					<div
						className="modula-custom-css-ai__loading"
						role="status"
						aria-live="polite"
					>
						<Spinner />
						<span>
							{__(
								'Generating CSS for this gallery…',
								'modula-best-grid-gallery'
							)}
						</span>
					</div>
				) : null}

				{error ? (
					<Notice status="error" isDismissible={false}>
						{error}
					</Notice>
				) : null}

				{preview ? (
					<div className="modula-custom-css-ai__preview">
						{preview.summary ? (
							<p className="modula-custom-css-ai__summary">
								{preview.summary}
							</p>
						) : null}
						{preview.warnings.length > 0 ? (
							<Notice status="warning" isDismissible={false}>
								{preview.warnings.join(' ')}
							</Notice>
						) : null}
						<TextareaControl
							__next40pxDefaultSize
							label={__(
								'Generated CSS',
								'modula-best-grid-gallery'
							)}
							value={preview.code}
							onChange={(value) =>
								setPreview((prev) =>
									prev ? { ...prev, code: value } : prev
								)
							}
							rows={10}
							className="modula-custom-css-ai__code"
						/>
						<div className="modula-custom-css-ai__apply-mode">
							<RadioControl
								label={__(
									'Apply mode',
									'modula-best-grid-gallery'
								)}
								selected={applyMode}
								options={[
									{
										label: __(
											'Replace existing custom CSS',
											'modula-best-grid-gallery'
										),
										value: 'replace',
									},
									{
										label: __(
											'Append to existing custom CSS',
											'modula-best-grid-gallery'
										),
										value: 'append',
									},
								]}
								onChange={(value) =>
									setApplyMode(
										value === 'append'
											? 'append'
											: 'replace'
									)
								}
							/>
						</div>
					</div>
				) : null}
			</div>
		</GalleryModal>
	);
}
