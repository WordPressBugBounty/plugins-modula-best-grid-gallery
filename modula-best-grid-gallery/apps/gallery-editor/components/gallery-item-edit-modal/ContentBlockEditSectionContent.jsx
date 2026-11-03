/**
 * One section's fields of the content block edit panel (Content, Spacing &
 * font, Colors), on admin-ui.
 */
import {
	formatGoogleFontPresetDisplayName,
	getContentBlockGoogleFontPresetKeys,
	normalizeBlockBackgroundImageId,
} from 'gallery-shared/preview';
import '../../styles/takeover/preview/_content-block-edit.scss';
import { useId } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import {
	rowHelpId,
	rowLabelId,
	Segmented,
	Select,
	SettingsRow,
	Textarea,
	TextInput,
} from 'admin-ui';
import SettingsColorControl from '../field/SettingsColorControl';
import WpClassicCaptionEditor from '../field/WpClassicCaptionEditor';
import ItemEditField from '../gallery-item-edit-panel/ItemEditField';
import ContentBlockBackgroundFields from './ContentBlockBackgroundFields';
import {
	CONTENT_BLOCK_BODY_TINYMCE_OPTIONS,
	composeContentBlockBgPickerValue,
	resolveContentBlockTextColor,
	splitContentBlockBgPickerValue,
} from '../../utils/contentBlockEditState';

const PADDING_OPTIONS = [
	{ label: __('Tight', 'modula-best-grid-gallery'), value: 'tight' },
	{ label: __('Default', 'modula-best-grid-gallery'), value: 'default' },
	{ label: __('Comfortable', 'modula-best-grid-gallery'), value: 'medium' },
	{ label: __('Roomy', 'modula-best-grid-gallery'), value: 'generous' },
];

const SYSTEM_FONT_OPTIONS = [
	{ label: __('System / UI', 'modula-best-grid-gallery'), value: 'default' },
	{ label: __('Serif', 'modula-best-grid-gallery'), value: 'serif' },
	{ label: __('Monospace', 'modula-best-grid-gallery'), value: 'mono' },
	{
		label: __('Bold poster (Arial Black)', 'modula-best-grid-gallery'),
		value: 'display',
	},
];

const TEXT_COLOR_MODE_OPTIONS = [
	{ value: 'auto', label: __('Auto', 'modula-best-grid-gallery') },
	{ value: 'custom', label: __('Custom', 'modula-best-grid-gallery') },
];

/**
 * @return {{ label: string, value: string }[]} System stacks, then the bundled Google fonts.
 */
function buildFontOptions() {
	return [
		...SYSTEM_FONT_OPTIONS,
		...getContentBlockGoogleFontPresetKeys().map((value) => ({
			value,
			label: formatGoogleFontPresetDisplayName(value),
		})),
	];
}

/**
 * @typedef {Object} SectionFieldsProps
 * @property {Object}   state
 * @property {Function} setState          `(updater) => void`.
 * @property {string}   fieldIdPrefix
 * @property {string}   editorInstanceKey Stable key for WpClassicCaptionEditor.
 * @property {boolean}  disabled
 * @property {boolean}  hasWpEditor
 */

/**
 * @param {SectionFieldsProps} props
 */
function ContentFields({
	state,
	setState,
	fieldIdPrefix,
	editorInstanceKey,
	disabled,
	hasWpEditor,
}) {
	const titleId = `${fieldIdPrefix}-title`;
	const subtitleId = `${fieldIdPrefix}-subtitle`;
	const bodyId = `${fieldIdPrefix}-body`;
	/** @param {string} blockBodyHtml */
	const setBody = (blockBodyHtml) =>
		setState((prev) => ({ ...prev, blockBodyHtml }));

	return (
		<>
			<ItemEditField
				label={__('Headline', 'modula-best-grid-gallery')}
				controlId={titleId}
				help={__(
					'Shown large on the tile. Keep it short for poster-style blocks.',
					'modula-best-grid-gallery'
				)}
			>
				<TextInput
					id={titleId}
					aria-describedby={rowHelpId(titleId)}
					placeholder={__(
						'e.g. Summer drop is live',
						'modula-best-grid-gallery'
					)}
					value={state.title}
					onChange={(title) =>
						setState((prev) => ({ ...prev, title }))
					}
					disabled={disabled}
				/>
			</ItemEditField>
			<ItemEditField
				label={__('Subtitle (plain text)', 'modula-best-grid-gallery')}
				controlId={subtitleId}
				help={__(
					'Optional. A smaller line under the headline.',
					'modula-best-grid-gallery'
				)}
			>
				<Textarea
					id={subtitleId}
					aria-describedby={rowHelpId(subtitleId)}
					value={state.description}
					onChange={(description) =>
						setState((prev) => ({ ...prev, description }))
					}
					disabled={disabled}
					rows={2}
				/>
			</ItemEditField>
			<ItemEditField
				label={__(
					'Formatted text (optional)',
					'modula-best-grid-gallery'
				)}
				controlId={hasWpEditor ? undefined : bodyId}
				help={__(
					'Use for links, lists, or longer copy. Simple poster tiles can leave this empty.',
					'modula-best-grid-gallery'
				)}
			>
				{hasWpEditor ? (
					<WpClassicCaptionEditor
						editorInstanceKey={editorInstanceKey}
						value={state.blockBodyHtml}
						onChange={setBody}
						disabled={disabled}
						accessibleLabel={__(
							'Formatted text (optional)',
							'modula-best-grid-gallery'
						)}
						className="modula-content-block-edit__textarea wp-editor-area"
						rows={10}
						tinymceOptions={CONTENT_BLOCK_BODY_TINYMCE_OPTIONS}
						preventInitFocus
					/>
				) : (
					<Textarea
						id={bodyId}
						aria-describedby={rowHelpId(bodyId)}
						value={state.blockBodyHtml}
						onChange={setBody}
						disabled={disabled}
						rows={14}
					/>
				)}
			</ItemEditField>
		</>
	);
}

/**
 * @param {SectionFieldsProps} props
 */
function SpacingFontFields({ state, setState, fieldIdPrefix, disabled }) {
	const paddingId = `${fieldIdPrefix}-padding`;
	const fontId = `${fieldIdPrefix}-font`;
	return (
		<>
			<ItemEditField
				label={__(
					'Padding inside the tile',
					'modula-best-grid-gallery'
				)}
				controlId={paddingId}
				help={__(
					'Increases space between the tile edge and your text.',
					'modula-best-grid-gallery'
				)}
			>
				<Select
					id={paddingId}
					aria-describedby={rowHelpId(paddingId)}
					options={PADDING_OPTIONS}
					value={state.blockPaddingPreset}
					onChange={(blockPaddingPreset) =>
						setState((prev) => ({ ...prev, blockPaddingPreset }))
					}
					disabled={disabled}
				/>
			</ItemEditField>
			<ItemEditField
				label={__('Typeface', 'modula-best-grid-gallery')}
				controlId={fontId}
				help={__(
					'System stacks need no extra assets. Other typefaces use font files bundled with Modula on your site.',
					'modula-best-grid-gallery'
				)}
			>
				<Select
					id={fontId}
					aria-describedby={rowHelpId(fontId)}
					options={buildFontOptions()}
					value={state.blockFontPreset}
					onChange={(blockFontPreset) =>
						setState((prev) => ({ ...prev, blockFontPreset }))
					}
					disabled={disabled}
				/>
			</ItemEditField>
		</>
	);
}

/**
 * @param {SectionFieldsProps} props
 */
function ColorFields({ state, setState, fieldIdPrefix, disabled }) {
	const tileBgId = `${fieldIdPrefix}-tile-bg`;
	const textColorModeId = `${fieldIdPrefix}-text-color-mode`;
	const textColorId = `${fieldIdPrefix}-text-color`;
	const hasBgImage =
		normalizeBlockBackgroundImageId(state.blockBackgroundImageId) > 0 ||
		(typeof state.blockBackgroundImageUrl === 'string' &&
			state.blockBackgroundImageUrl.trim() !== '');
	const effectiveTextColor = resolveContentBlockTextColor(state);
	const useCustomTextColor = Boolean(state.fgHex);

	/** @param {string} next */
	const onTileBackgroundChange = (next) => {
		const split = splitContentBlockBgPickerValue(next, {
			hasImage: hasBgImage,
			previousOpacity: state.blockBackgroundOverlayOpacity,
		});
		setState((prev) => ({
			...prev,
			bg: split.bg,
			blockBackgroundOverlayOpacity: split.blockBackgroundOverlayOpacity,
		}));
	};

	/** @param {string} mode */
	const onTextColorModeChange = (mode) => {
		if (mode === 'auto') {
			setState((prev) => ({ ...prev, fgHex: '' }));
			return;
		}
		setState((prev) => ({
			...prev,
			fgHex: prev.fgHex || effectiveTextColor,
		}));
	};

	return (
		<>
			<SettingsRow
				label={__('Tile background', 'modula-best-grid-gallery')}
				controlId={tileBgId}
			>
				<SettingsColorControl
					id={tileBgId}
					label={__('Tile background', 'modula-best-grid-gallery')}
					value={composeContentBlockBgPickerValue(
						state.bg,
						state.blockBackgroundOverlayOpacity,
						hasBgImage
					)}
					acceptAlpha
					clearable
					clearLabel={__('Clear', 'modula-best-grid-gallery')}
					onChange={onTileBackgroundChange}
					disabled={disabled}
				/>
			</SettingsRow>
			<ContentBlockBackgroundFields
				state={state}
				setState={setState}
				disabled={disabled}
				editorId={fieldIdPrefix}
			/>
			<SettingsRow
				label={__('Text color', 'modula-best-grid-gallery')}
				controlId={textColorModeId}
				labelElement="span"
			>
				<Segmented
					aria-labelledby={rowLabelId(textColorModeId)}
					options={TEXT_COLOR_MODE_OPTIONS}
					value={useCustomTextColor ? 'custom' : 'auto'}
					disabled={disabled}
					onChange={onTextColorModeChange}
				/>
			</SettingsRow>
			<div className="modula-gallery-item-edit-panel__field">
				<SettingsColorControl
					id={textColorId}
					label={__('Text color', 'modula-best-grid-gallery')}
					value={effectiveTextColor}
					onChange={(fgHex) =>
						setState((prev) => ({ ...prev, fgHex }))
					}
					disabled={disabled || !useCustomTextColor}
				/>
				<p className="modula-gallery-item-edit-panel__field-help">
					{__(
						'Auto keeps text readable based on the selected tile background.',
						'modula-best-grid-gallery'
					)}
				</p>
			</div>
		</>
	);
}

/** Fields by section name (`CONTENT_BLOCK_MODAL_SECTIONS`). */
const SECTION_FIELDS = {
	content: ContentFields,
	'spacing-font': SpacingFontFields,
	colors: ColorFields,
};

/**
 * @param {Object}   props
 * @param {string}   props.sectionName
 * @param {Object}   props.state
 * @param {Function} props.setState
 * @param {string}   props.editorInstanceKey Stable key for WpClassicCaptionEditor.
 * @param {boolean}  props.disabled
 * @param {boolean}  props.hasWpEditor
 */
export default function ContentBlockEditSectionContent({
	sectionName,
	...props
}) {
	const fieldIdPrefix = `modula-cb-${useId()}`;
	const Fields = Object.hasOwn(SECTION_FIELDS, sectionName)
		? SECTION_FIELDS[sectionName]
		: null;
	if (!Fields) {
		return null;
	}
	return <Fields {...props} fieldIdPrefix={fieldIdPrefix} />;
}
