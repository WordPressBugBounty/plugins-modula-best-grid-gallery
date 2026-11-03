/**
 * Image edit panel — the text: AI suggestions, Alt text, Title and Caption.
 */
import { useId } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Button, TextInput } from 'admin-ui';
import { ItemEditCard } from 'editor-shell';
import { resolveModulaAiGenerateUiState } from 'gallery-shared/utils/modulaAiAvailability';
import { useModulaSettingsEditorConfig } from '../../hooks/useModulaSettingsEditorConfig';
import { useModulaAiDescriptorSettingsQuery } from '../../query/useModulaAiDescriptorSettingsQuery';
import {
	imageMetadataAiFormKey,
	useImageMetadataAiGeneration,
} from '../../hooks/useImageMetadataAiGeneration';
import WpClassicCaptionEditor from '../field/WpClassicCaptionEditor';
import { CAPTION_EDITOR_CONTENT_STYLE } from '../field/captionEditorContentStyle';
import ImageMetadataAiSparkleIcon from '../image-metadata-modal/ImageMetadataAiSparkleIcon';
import GalleryItemAiGenerateButton from './GalleryItemAiGenerateButton';
import ItemEditField from './ItemEditField';

/** The "all fields" AI button's label, by `primaryLabelKey`. */
const AI_PRIMARY_LABELS = {
	unavailable_localhost: __(
		'AI unavailable on localhost',
		'modula-best-grid-gallery'
	),
	generating: __('Generating…', 'modula-best-grid-gallery'),
	generate: __('Generate metadata with AI', 'modula-best-grid-gallery'),
	configure: __('Configure Modula AI', 'modula-best-grid-gallery'),
};

/** The per-field Generate button's name. */
const AI_FIELD_LABELS = {
	alt: __('Generate alt text', 'modula-best-grid-gallery'),
	title: __('Generate title', 'modula-best-grid-gallery'),
	caption: __('Generate caption', 'modula-best-grid-gallery'),
};

/**
 * The caption stays a rich editor: captions store HTML (bold, links, colours,
 * `<br>` line breaks) that a plain textarea would show as markup, and
 * captions render without `wpautop`, so typed newlines would not break lines.
 * This skin brings it near the canvas's plain field: sans text at 14px, and a
 * transparent page so the card's admin-ui surface shows through (the editor
 * paints the page and its text from the scope's admin-ui tokens otherwise).
 */
const CAPTION_TINYMCE_OPTIONS = Object.freeze({
	content_style: CAPTION_EDITOR_CONTENT_STYLE,
});

/**
 * @param {Object} props
 * @param {Object} props.form         Image metadata form.
 * @param {number} props.storeIndex
 * @param {number} props.attachmentId
 */
export default function ImageEditTextCard({ form, storeIndex, attachmentId }) {
	const editor = useModulaSettingsEditorConfig();
	const baseId = `modula-item-text-${useId()}`;
	const aiSettingsQuery = useModulaAiDescriptorSettingsQuery({
		enabled: attachmentId > 0,
	});
	const aiConfigured = Boolean(aiSettingsQuery.data?.aiConfigured);
	const {
		aiBusy,
		aiStatus,
		aiSuggestedFields,
		generateAllMetadata,
		generateField,
		redirectToAiSettings,
	} = useImageMetadataAiGeneration({
		attachmentId,
		aiConfigured,
		form,
		editorConfig: editor,
	});
	const aiUi = resolveModulaAiGenerateUiState({
		unavailableOnLocalhost: Boolean(
			aiSettingsQuery.data?.unavailableOnLocalhost
		),
		aiConfigured,
		aiBusy,
	});
	const primaryHandlers = {
		generate: generateAllMetadata,
		configure: redirectToAiSettings,
	};

	/**
	 * @param {'title'|'alt'|'caption'} fieldKey
	 * @return {import('react').ReactNode} The suggestion badge and Generate.
	 */
	const renderAiLabelEnd = (fieldKey) => (
		<span className="modula-gallery-item-edit-panel__ai-label-end">
			{aiSuggestedFields?.has?.(imageMetadataAiFormKey(fieldKey)) ? (
				<span className="modula-gallery-item-edit-panel__ai-badge">
					{__('AI suggestion', 'modula-best-grid-gallery')}
				</span>
			) : null}
			{aiUi.showFieldGenerate ? (
				<GalleryItemAiGenerateButton
					busy={aiBusy}
					ariaLabel={AI_FIELD_LABELS[fieldKey]}
					onClick={() => generateField(fieldKey)}
				/>
			) : null}
		</span>
	);

	return (
		<ItemEditCard className="modula-gallery-item-edit-panel__text">
			<div className="modula-gallery-item-edit-panel__ai">
				<Button
					className="modula-gallery-item-edit-panel__ai-button"
					icon={<ImageMetadataAiSparkleIcon />}
					disabled={aiUi.primaryDisabled}
					onClick={primaryHandlers[aiUi.primaryAction]}
				>
					{AI_PRIMARY_LABELS[aiUi.primaryLabelKey]}
				</Button>
				{aiStatus === 'success' ? (
					<p
						className="modula-gallery-item-edit-panel__ai-notice is-success"
						role="status"
					>
						{__(
							'AI suggestions added. Review them in the fields below.',
							'modula-best-grid-gallery'
						)}
					</p>
				) : null}
				{aiStatus === 'error' ? (
					<p
						className="modula-gallery-item-edit-panel__ai-notice is-error"
						role="alert"
					>
						{__(
							'Could not generate metadata. Please try again.',
							'modula-best-grid-gallery'
						)}
					</p>
				) : null}
			</div>
			<form.Field name="alt">
				{(field) => (
					<ItemEditField
						label={__('Alt text', 'modula-best-grid-gallery')}
						controlId={`${baseId}-alt`}
						labelEnd={renderAiLabelEnd('alt')}
						help={__(
							'Read aloud by screen readers and shown if the image fails to load.',
							'modula-best-grid-gallery'
						)}
					>
						<TextInput
							id={`${baseId}-alt`}
							value={field.state.value ?? ''}
							onChange={(v) => field.handleChange(v)}
						/>
					</ItemEditField>
				)}
			</form.Field>
			<form.Field name="title">
				{(field) => (
					<ItemEditField
						label={__('Title', 'modula-best-grid-gallery')}
						controlId={`${baseId}-title`}
						labelEnd={renderAiLabelEnd('title')}
					>
						<TextInput
							id={`${baseId}-title`}
							value={field.state.value ?? ''}
							onChange={(v) => field.handleChange(v)}
						/>
					</ItemEditField>
				)}
			</form.Field>
			<form.Field name="description">
				{(field) => (
					<ItemEditField
						label={__('Caption', 'modula-best-grid-gallery')}
						labelEnd={renderAiLabelEnd('caption')}
					>
						<WpClassicCaptionEditor
							editorInstanceKey={`${storeIndex}-${attachmentId}`}
							value={field.state.value ?? ''}
							onChange={(v) => field.handleChange(v)}
							disabled={false}
							accessibleLabel={__(
								'Caption',
								'modula-best-grid-gallery'
							)}
							rows={4}
							tinymceOptions={CAPTION_TINYMCE_OPTIONS}
							preventInitFocus
							enableCodeView
						/>
					</ItemEditField>
				)}
			</form.Field>
		</ItemEditCard>
	);
}
