import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Button, CopyField, Textarea } from 'admin-ui';
import { isNil } from '../../../logic/isNil';
import { getModulaSettingsEditorConfig } from '../../../config/modulaSettingsEditorConfig';
import { resolveGalleryAdminPostId } from '../../../utils/resolveGalleryAdminPostId';
import ImageMetadataAiSparkleIcon from '../../image-metadata-modal/ImageMetadataAiSparkleIcon';
import CustomCssAiModal from '../../custom-css-ai/CustomCssAiModal';
import { ControlHelp, describedByHelp } from './ControlHelp';
import { useCssCodeEditor } from './useCssCodeEditor';

// The canvas editor's height: 21 lines of 20px.
const MIN_LINES = 21;

/**
 * Custom CSS as the canvas's code editor (dark, monospace, line numbers,
 * Tab indents), the gallery's selector with Copy on the label line, and the
 * AI assist button.
 *
 * @param {import('../fieldControlKinds').FieldControlContext} ctx
 */
export function renderCustomCssTextareaKind({
	controlId,
	value,
	onChange,
	disabled,
	help,
}) {
	return (
		<CustomCssTextareaField
			controlId={controlId}
			value={value}
			onChange={onChange}
			disabled={disabled}
			help={help}
		/>
	);
}

/**
 * @param {Object}           props
 * @param {string}           props.controlId
 * @param {*}                props.value
 * @param {Function}         props.onChange
 * @param {boolean}          props.disabled
 * @param {string|undefined} props.help
 */
function CustomCssTextareaField({
	controlId,
	value,
	onChange,
	disabled,
	help,
}) {
	const [aiOpen, setAiOpen] = useState(false);
	const cssValue = isNil(value) ? '' : String(value);
	const editor = useCssCodeEditor({ value: cssValue, onChange });
	const lineCount = editor.value.split('\n').length;
	const keysHintId = `${controlId}-keys`;
	const galleryId = resolveGalleryAdminPostId(
		getModulaSettingsEditorConfig()
	);

	return (
		<div className="modula-custom-css-field">
			{/* The modern shortcode's wrapper id (`#modula-{id}`). */}
			{galleryId > 0 ? (
				<CopyField
					className="modula-custom-css-field__scope"
					value={`#modula-${galleryId}`}
					copyLabel={__(
						'Copy the gallery selector',
						'modula-best-grid-gallery'
					)}
					disabled={disabled}
				/>
			) : null}
			<div className="modula-custom-css-field__editor">
				<div
					className="modula-custom-css-field__gutter"
					aria-hidden="true"
				>
					{Array.from({ length: lineCount }, (_, index) => (
						<span key={index}>{index + 1}</span>
					))}
				</div>
				{/* Lines do not wrap, so each stays beside its number. */}
				<Textarea
					id={controlId}
					{...editor}
					disabled={disabled}
					rows={Math.max(lineCount, MIN_LINES)}
					wrap="off"
					className="modula-custom-css-field__textarea"
					aria-describedby={[
						describedByHelp(controlId, help),
						keysHintId,
					]
						.filter(Boolean)
						.join(' ')}
					spellCheck={false}
					autoCapitalize="off"
					autoComplete="off"
				/>
				<p id={keysHintId} className="screen-reader-text">
					{__(
						'Tab indents. To leave the editor, press Escape, then Tab.',
						'modula-best-grid-gallery'
					)}
				</p>
			</div>
			<div className="modula-custom-css-field__toolbar">
				<Button
					disabled={disabled}
					onClick={() => setAiOpen(true)}
					className="modula-custom-css-field__ai-btn"
					icon={<ImageMetadataAiSparkleIcon />}
				>
					{__(
						'Describe the change instead',
						'modula-best-grid-gallery'
					)}
				</Button>
			</div>
			<ControlHelp help={help} controlId={controlId} />
			<CustomCssAiModal
				isOpen={aiOpen}
				onClose={() => setAiOpen(false)}
				currentCss={cssValue}
				onApply={onChange}
			/>
		</div>
	);
}
