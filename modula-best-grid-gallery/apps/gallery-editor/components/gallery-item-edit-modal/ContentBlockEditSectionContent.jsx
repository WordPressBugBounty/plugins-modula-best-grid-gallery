/**
 * Active section fields for content block editing (settings sidebar panel).
 */
import {
	formatGoogleFontPresetDisplayName,
	getContentBlockGoogleFontPresetKeys,
	normalizeBlockBackgroundImageId,
} from 'gallery-shared/preview';
import '../../styles/takeover/preview/_image-metadata-modal.scss';
import '../../styles/takeover/preview/_content-block-edit.scss';
import { Fragment, useMemo } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import {
	FieldStack,
	Segmented,
	Select,
	SettingsRow,
	Textarea,
	TextInput,
} from 'shared-ui';
import { CONTENT_BLOCK_MODAL_SECTIONS } from '../../constants/contentBlockModalSections';
import CompactColorControl from '../field/CompactColorControl';
import WpClassicCaptionEditor from '../field/WpClassicCaptionEditor';
import ContentBlockBackgroundFields from './ContentBlockBackgroundFields';
import {
	CONTENT_BLOCK_BODY_TINYMCE_OPTIONS,
	composeContentBlockBgPickerValue,
	resolveContentBlockTextColor,
	splitContentBlockBgPickerValue,
} from '../../utils/contentBlockEditState';

/**
 * @param {boolean} hideSectionChrome
 * @param {import('react').ReactNode} children
 */
function SectionFieldsShell({ hideSectionChrome, children }) {
	if (hideSectionChrome) {
		return <Fragment>{children}</Fragment>;
	}
	return (
		<div className="modula-image-metadata-modal__section-fields">
			{children}
		</div>
	);
}

/**
 * @param {Object}   props
 * @param {string}   props.sectionName
 * @param {Object}   props.state
 * @param {Function} props.setState
 * @param {string}   props.editorInstanceKey Stable key for WpClassicCaptionEditor.
 * @param {boolean}  props.disabled
 * @param {boolean}  props.hasWpEditor
 * @param {boolean}  [props.hideSectionChrome] When true (settings sidebar), skip modal section header.
 */
export default function ContentBlockEditSectionContent({
	sectionName,
	state,
	setState,
	editorInstanceKey,
	disabled,
	hasWpEditor,
	hideSectionChrome = false,
}) {
	const fieldIdPrefix = `modula-cb-${editorInstanceKey}`;
	const sectionMeta = CONTENT_BLOCK_MODAL_SECTIONS.find(
		(s) => s.name === sectionName
	);

	const hasBgImage =
		normalizeBlockBackgroundImageId(state.blockBackgroundImageId) > 0 ||
		(typeof state.blockBackgroundImageUrl === 'string' &&
			state.blockBackgroundImageUrl.trim() !== '');
	const effectiveTextColor = resolveContentBlockTextColor(state);
	const useCustomTextColor = Boolean(state.fgHex);
	const tileBgPickerValue = composeContentBlockBgPickerValue(
		state.bg,
		state.blockBackgroundOverlayOpacity,
		hasBgImage
	);

	const paddingOptions = useMemo(
		() => [
			{
				label: __('Tight', 'modula-best-grid-gallery'),
				value: 'tight',
			},
			{
				label: __('Default', 'modula-best-grid-gallery'),
				value: 'default',
			},
			{
				label: __('Comfortable', 'modula-best-grid-gallery'),
				value: 'medium',
			},
			{
				label: __('Roomy', 'modula-best-grid-gallery'),
				value: 'generous',
			},
		],
		[]
	);

	const fontOptions = useMemo(() => {
		const system = [
			{
				label: __('System / UI', 'modula-best-grid-gallery'),
				value: 'default',
			},
			{
				label: __('Serif', 'modula-best-grid-gallery'),
				value: 'serif',
			},
			{
				label: __('Monospace', 'modula-best-grid-gallery'),
				value: 'mono',
			},
			{
				label: __(
					'Bold poster (Arial Black)',
					'modula-best-grid-gallery'
				),
				value: 'display',
			},
		];
		const google = getContentBlockGoogleFontPresetKeys().map((value) => ({
			value,
			label: formatGoogleFontPresetDisplayName(value),
		}));
		return [...system, ...google];
	}, []);

	const textColorModeOptions = useMemo(
		() => [
			{ value: 'auto', label: __('Auto', 'modula-best-grid-gallery') },
			{
				value: 'custom',
				label: __('Custom', 'modula-best-grid-gallery'),
			},
		],
		[]
	);

	const textColorLabelId = `${fieldIdPrefix}-text-color-label`;

	let sectionBody = null;

	if (sectionName === 'content') {
		sectionBody = (
			<SectionFieldsShell hideSectionChrome={hideSectionChrome}>
				<FieldStack
					label={__('Headline', 'modula-best-grid-gallery')}
					help={__(
						'Shown large on the tile. Keep it short for poster-style blocks.',
						'modula-best-grid-gallery'
					)}
					htmlFor={`${fieldIdPrefix}-title`}
				>
					<TextInput
						id={`${fieldIdPrefix}-title`}
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
				</FieldStack>
				<FieldStack
					label={__(
						'Subtitle (plain text)',
						'modula-best-grid-gallery'
					)}
					help={__(
						'Optional. A smaller line under the headline.',
						'modula-best-grid-gallery'
					)}
					htmlFor={`${fieldIdPrefix}-subtitle`}
				>
					<Textarea
						id={`${fieldIdPrefix}-subtitle`}
						value={state.description}
						onChange={(description) =>
							setState((prev) => ({ ...prev, description }))
						}
						disabled={disabled}
						rows={2}
					/>
				</FieldStack>
				<FieldStack
					label={__(
						'Formatted text (optional)',
						'modula-best-grid-gallery'
					)}
					help={__(
						'Use for links, lists, or longer copy. Simple poster tiles can leave this empty.',
						'modula-best-grid-gallery'
					)}
					htmlFor={`${fieldIdPrefix}-body`}
				>
					{hasWpEditor ? (
						<WpClassicCaptionEditor
							editorInstanceKey={editorInstanceKey}
							value={state.blockBodyHtml}
							onChange={(blockBodyHtml) =>
								setState((prev) => ({
									...prev,
									blockBodyHtml,
								}))
							}
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
							id={`${fieldIdPrefix}-body`}
							value={state.blockBodyHtml}
							onChange={(blockBodyHtml) =>
								setState((prev) => ({
									...prev,
									blockBodyHtml,
								}))
							}
							disabled={disabled}
							rows={14}
						/>
					)}
				</FieldStack>
			</SectionFieldsShell>
		);
	} else if (sectionName === 'spacing-font') {
		sectionBody = (
			<SectionFieldsShell hideSectionChrome={hideSectionChrome}>
				<FieldStack
					label={__(
						'Padding inside the tile',
						'modula-best-grid-gallery'
					)}
					help={__(
						'Increases space between the tile edge and your text.',
						'modula-best-grid-gallery'
					)}
					htmlFor={`${fieldIdPrefix}-padding`}
				>
					<Select
						id={`${fieldIdPrefix}-padding`}
						options={paddingOptions}
						value={state.blockPaddingPreset}
						onChange={(blockPaddingPreset) =>
							setState((prev) => ({
								...prev,
								blockPaddingPreset,
							}))
						}
						disabled={disabled}
					/>
				</FieldStack>
				<FieldStack
					label={__('Typeface', 'modula-best-grid-gallery')}
					help={__(
						'System stacks need no extra assets. Other typefaces use font files bundled with Modula on your site.',
						'modula-best-grid-gallery'
					)}
					htmlFor={`${fieldIdPrefix}-font`}
				>
					<Select
						id={`${fieldIdPrefix}-font`}
						options={fontOptions}
						value={state.blockFontPreset}
						onChange={(blockFontPreset) =>
							setState((prev) => ({ ...prev, blockFontPreset }))
						}
						disabled={disabled}
					/>
				</FieldStack>
			</SectionFieldsShell>
		);
	} else if (sectionName === 'colors') {
		sectionBody = (
			<SectionFieldsShell hideSectionChrome={hideSectionChrome}>
				<SettingsRow
					className="modula-settings-panel__color-row"
					label={__('Tile background', 'modula-best-grid-gallery')}
					end={
						<CompactColorControl
							variant="swatch"
							value={tileBgPickerValue}
							enableAlpha
							clearable
							clearLabel={__('Clear', 'modula-best-grid-gallery')}
							onChange={(next) => {
								const split = splitContentBlockBgPickerValue(
									next,
									{
										hasImage: hasBgImage,
										previousOpacity:
											state.blockBackgroundOverlayOpacity,
									}
								);
								setState((prev) => ({
									...prev,
									bg: split.bg,
									blockBackgroundOverlayOpacity:
										split.blockBackgroundOverlayOpacity,
								}));
							}}
							disabled={disabled}
						/>
					}
				/>
				<ContentBlockBackgroundFields
					state={state}
					setState={setState}
					disabled={disabled}
					editorId={fieldIdPrefix}
				/>
				<div className="modula-gallery-item-edit-panel__control-stack">
					<span
						className="modula-settings-panel__segmented-row-label"
						id={textColorLabelId}
					>
						{__('Text color', 'modula-best-grid-gallery')}
					</span>
					<Segmented
						aria-labelledby={textColorLabelId}
						options={textColorModeOptions}
						value={useCustomTextColor ? 'custom' : 'auto'}
						disabled={disabled}
						onChange={(mode) => {
							if (mode === 'auto') {
								setState((prev) => ({ ...prev, fgHex: '' }));
								return;
							}
							setState((prev) => ({
								...prev,
								fgHex: prev.fgHex || effectiveTextColor,
							}));
						}}
					/>
					<div
						className={`modula-settings-editor__color-picker modula-settings-editor__color-picker--swatch${
							disabled || !useCustomTextColor
								? ' is-disabled'
								: ''
						}`}
					>
						<CompactColorControl
							variant="swatch"
							value={effectiveTextColor}
							onChange={(fgHex) =>
								setState((prev) => ({ ...prev, fgHex }))
							}
							disabled={disabled || !useCustomTextColor}
						/>
					</div>
					<p className="modula-gallery-item-edit-panel__file-help">
						{__(
							'Auto keeps text readable based on the selected tile background.',
							'modula-best-grid-gallery'
						)}
					</p>
				</div>
			</SectionFieldsShell>
		);
	}

	if (hideSectionChrome) {
		return sectionBody;
	}

	return (
		<div className="modula-image-metadata-modal__section">
			{sectionMeta ? (
				<header className="modula-image-metadata-modal__section-header">
					<h3 className="modula-image-metadata-modal__section-title">
						{sectionMeta.title}
					</h3>
					{sectionMeta.description ? (
						<p className="modula-image-metadata-modal__section-description">
							{sectionMeta.description}
						</p>
					) : null}
				</header>
			) : null}
			{sectionBody}
		</div>
	);
}
