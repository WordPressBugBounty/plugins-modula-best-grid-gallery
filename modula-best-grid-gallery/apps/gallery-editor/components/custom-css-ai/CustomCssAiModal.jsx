import { useId, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import {
	Button,
	ChoiceList,
	Notice,
	SettingsRow,
	Spinner,
	Textarea,
	rowDescriptionId,
	rowLabelId,
} from 'admin-ui';
import { GalleryModal } from 'editor-shell';
import '../../styles/takeover/preview/_custom-css-ai-modal.scss';
import { useModulaSettingsEditorConfig } from '../../hooks/useModulaSettingsEditorConfig';
import { useGenerateCustomCssMutation } from '../../query/useGenerateCustomCssMutation';

/**
 * @param {Object}                    props
 * @param {boolean}                   props.isOpen
 * @param {() => void}                props.onClose
 * @param {string}                    props.currentCss
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
	const idBase = `modula-custom-css-ai-${useId()}`;
	const promptId = `${idBase}-prompt`;
	const codeId = `${idBase}-code`;
	const applyModeId = `${idBase}-apply-mode`;

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
			bodyClassName="modula-custom-css-ai-modal__body"
			title={__('Generate custom CSS', 'modula-best-grid-gallery')}
			subtitle={__(
				'Scoped to this gallery only',
				'modula-best-grid-gallery'
			)}
			closeDisabled={mutation.isPending}
			footerRight={
				<>
					<Button
						variant="ghost"
						onClick={handleClose}
						disabled={mutation.isPending}
					>
						{__('Cancel', 'modula-best-grid-gallery')}
					</Button>
					{preview ? (
						<>
							<Button
								onClick={handleGenerate}
								disabled={mutation.isPending}
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
					<SettingsRow
						label={__(
							'What should change?',
							'modula-best-grid-gallery'
						)}
						controlId={promptId}
						description={__(
							'Example: round image corners, softer tile shadow, larger title on hover.',
							'modula-best-grid-gallery'
						)}
						stacked
					>
						<Textarea
							id={promptId}
							aria-describedby={rowDescriptionId(promptId)}
							value={prompt}
							onChange={setPrompt}
							rows={5}
							disabled={mutation.isPending}
						/>
					</SettingsRow>
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

				{/* An error interrupts; the warnings below wait their turn. */}
				{error ? (
					<Notice tone="error" role="alert">
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
							<Notice tone="warning" role="status">
								{preview.warnings.join(' ')}
							</Notice>
						) : null}
						<SettingsRow
							label={__(
								'Generated CSS',
								'modula-best-grid-gallery'
							)}
							controlId={codeId}
							stacked
						>
							<Textarea
								id={codeId}
								value={preview.code}
								onChange={(value) =>
									setPreview((prev) =>
										prev ? { ...prev, code: value } : prev
									)
								}
								rows={10}
								className="modula-custom-css-ai__code"
							/>
						</SettingsRow>
						<SettingsRow
							label={__('Apply mode', 'modula-best-grid-gallery')}
							controlId={applyModeId}
							labelElement="span"
							stacked
						>
							<ChoiceList
								aria-labelledby={rowLabelId(applyModeId)}
								className="modula-custom-css-ai__apply-mode"
								value={applyMode}
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
						</SettingsRow>
					</div>
				) : null}
			</div>
		</GalleryModal>
	);
}
