/**
 * Modal: edit v2 content block (headline, optional subtitle & WYSIWYG, colors).
 */
import {
	contentBlockTextColorPaletteForBackground,
	formatGoogleFontPresetDisplayName,
	getContentBlockGoogleFontPresetKeys,
} from 'gallery-shared/preview';
import { useCallback, useMemo, useState } from '@wordpress/element';
import '../../styles/takeover/preview/_content-block-edit.scss';
import { __, sprintf } from '@wordpress/i18n';
import {
	BaseControl,
	Button,
	SelectControl,
	TextControl,
	TextareaControl,
} from '@wordpress/components';
import CompactColorControl from '../field/CompactColorControl';
import GalleryModal from '../gallery-modal/GalleryModal';
import ContentBlockBackgroundFields from '../gallery-item-edit-modal/ContentBlockBackgroundFields';
import WpClassicCaptionEditor from '../field/WpClassicCaptionEditor';
import {
	CONTENT_BLOCK_BODY_TINYMCE_OPTIONS,
	contentBlockRowStableKey,
	contentBlockStateToSaveFields,
	createContentBlockEditInitialState,
	resolveContentBlockTextColor,
} from '../../utils/contentBlockEditState';
import { snapshotCaptionFromImageMetadataEditor } from '../../utils/galleryItemEditDirtyState';

/**
 * @param {Object}                            props
 * @param {Object}                            props.initialRow
 * @param {Function}                          props.onClose
 * @param {(fields: Object) => Promise<void>} props.onSave
 */
function ContentBlockEditModalBody({ initialRow, onClose, onSave }) {
	const editorInstanceKey = useMemo(() => {
		const raw = contentBlockRowStableKey(initialRow);
		return `cb-modal-${raw}`;
	}, [initialRow]);
	const fieldIdPrefix = `modula-cb-${editorInstanceKey}`;

	const [state, setState] = useState(() =>
		createContentBlockEditInitialState(initialRow)
	);
	const [saving, setSaving] = useState(false);
	const textColorPalette = useMemo(() => {
		const hasImage =
			Number(state.blockBackgroundImageId) > 0 ||
			(typeof state.blockBackgroundImageUrl === 'string' &&
				state.blockBackgroundImageUrl.trim() !== '');
		if (hasImage) {
			const solid = resolveContentBlockTextColor({
				...state,
				fgHex: '',
			});
			return solid === '#ffffff'
				? ['#ffffff', '#111111']
				: ['#111111', '#ffffff'];
		}
		return contentBlockTextColorPaletteForBackground(state.bg);
	}, [state]);
	const effectiveTextColor = resolveContentBlockTextColor(state);
	const useCustomTextColor = Boolean(state.fgHex);

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

	const hasWpEditor = Boolean(
		typeof window !== 'undefined' && window.wp?.oldEditor?.initialize
	);

	const handleSave = useCallback(async () => {
		const liveBody = hasWpEditor
			? snapshotCaptionFromImageMetadataEditor(editorInstanceKey)
			: undefined;
		const body = liveBody !== undefined ? liveBody : state.blockBodyHtml;
		setSaving(true);
		try {
			await onSave(
				contentBlockStateToSaveFields({
					...state,
					blockBodyHtml: body,
				})
			);
			onClose();
		} finally {
			setSaving(false);
		}
	}, [editorInstanceKey, hasWpEditor, state, onSave, onClose]);

	return (
		<GalleryModal
			isOpen
			onClose={onClose}
			size="large"
			title={__('Edit content block', 'modula-best-grid-gallery')}
			className="modula-content-block-edit-modal"
			bodyClassName="modula-content-block-edit"
			bodyOverflow="auto"
			closeOnBackdropClick={!saving}
			closeOnEscape={!saving}
			showClose={!saving}
			footerRight={
				<>
					<Button
						variant="tertiary"
						className="modula-gallery-modal__footer-cancel"
						onClick={onClose}
						disabled={saving}
					>
						{__('Cancel', 'modula-best-grid-gallery')}
					</Button>
					<Button
						variant="primary"
						className="modula-gallery-modal__footer-primary"
						onClick={() => void handleSave()}
						isBusy={saving}
						disabled={saving}
					>
						{__('Save changes', 'modula-best-grid-gallery')}
					</Button>
				</>
			}
		>
			<div className="modula-content-block-edit__inner">
				<p className="modula-content-block-edit__intro">
					{__(
						'Start with a short headline — it is shown large on the tile. Add a subtitle or formatted text only when you need extra detail (links, lists).',
						'modula-best-grid-gallery'
					)}
				</p>
				<TextControl
					__next40pxDefaultSize
					__nextHasNoMarginBottom
					label={__('Headline', 'modula-best-grid-gallery')}
					placeholder={__(
						'e.g. Summer drop is live',
						'modula-best-grid-gallery'
					)}
					value={state.title}
					onChange={(title) =>
						setState((prev) => ({ ...prev, title }))
					}
					disabled={saving}
				/>
				<TextareaControl
					__next40pxDefaultSize
					label={__(
						'Subtitle (plain text)',
						'modula-best-grid-gallery'
					)}
					help={__(
						'Optional. A smaller line under the headline. Leave empty for a single bold message.',
						'modula-best-grid-gallery'
					)}
					value={state.description}
					onChange={(description) =>
						setState((prev) => ({ ...prev, description }))
					}
					disabled={saving}
					rows={2}
				/>
				<div className="modula-content-block-edit__body">
					<BaseControl
						id={`${fieldIdPrefix}-body`}
						label={__(
							'Formatted text (optional)',
							'modula-best-grid-gallery'
						)}
						help={__(
							'Use for links, lists, or longer copy. Simple “poster” tiles can leave this empty.',
							'modula-best-grid-gallery'
						)}
						className="modula-content-block-edit__body-control"
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
								disabled={saving}
								accessibleLabel={__(
									'Formatted text (optional)',
									'modula-best-grid-gallery'
								)}
								className="modula-content-block-edit__textarea wp-editor-area"
								rows={10}
								tinymceOptions={
									CONTENT_BLOCK_BODY_TINYMCE_OPTIONS
								}
								preventInitFocus
							/>
						) : (
							<TextareaControl
								__next40pxDefaultSize
								label={__(
									'Formatted text (HTML)',
									'modula-best-grid-gallery'
								)}
								hideLabelFromVision
								value={state.blockBodyHtml}
								onChange={(blockBodyHtml) =>
									setState((prev) => ({
										...prev,
										blockBodyHtml,
									}))
								}
								disabled={saving}
								rows={14}
							/>
						)}
						{!hasWpEditor ? (
							<p className="modula-content-block-edit__hint">
								{__(
									'Visual editor unavailable; editing raw HTML.',
									'modula-best-grid-gallery'
								)}
							</p>
						) : null}
					</BaseControl>
				</div>
				<div className="modula-content-block-edit__layout">
					<span className="components-base-control__label">
						{__('Spacing & font', 'modula-best-grid-gallery')}
					</span>
					<div className="modula-content-block-edit__layout-grid">
						<SelectControl
							__next40pxDefaultSize
							__nextHasNoMarginBottom
							label={__(
								'Padding inside the tile',
								'modula-best-grid-gallery'
							)}
							value={state.blockPaddingPreset}
							options={paddingOptions}
							onChange={(blockPaddingPreset) =>
								setState((prev) => ({
									...prev,
									blockPaddingPreset,
								}))
							}
							disabled={saving}
							help={__(
								'Increases space between the tile edge and your text.',
								'modula-best-grid-gallery'
							)}
						/>
						<SelectControl
							__next40pxDefaultSize
							__nextHasNoMarginBottom
							label={__('Typeface', 'modula-best-grid-gallery')}
							value={state.blockFontPreset}
							options={fontOptions}
							onChange={(blockFontPreset) =>
								setState((prev) => ({
									...prev,
									blockFontPreset,
								}))
							}
							disabled={saving}
							help={__(
								'System stacks need no extra assets. Other typefaces use font files bundled with Modula on your site (no Google Fonts CDN).',
								'modula-best-grid-gallery'
							)}
						/>
					</div>
				</div>
				<div className="modula-content-block-edit__colors">
					<span className="components-base-control__label">
						{__('Tile colors', 'modula-best-grid-gallery')}
					</span>
					<div className="modula-content-block-edit__colors-grid">
						<div className="modula-content-block-edit__color-field">
							<label
								className="modula-content-block-edit__color-label"
								htmlFor={`${fieldIdPrefix}-bg`}
							>
								{__(
									'Tile background',
									'modula-best-grid-gallery'
								)}
							</label>
							<div
								className={`modula-settings-editor__color-picker modula-settings-editor__color-picker--swatch${
									saving ? ' is-disabled' : ''
								}`}
							>
								<CompactColorControl
									variant="swatch"
									value={state.bg}
									enableAlpha
									clearable
									clearLabel={__(
										'Clear',
										'modula-best-grid-gallery'
									)}
									onChange={(bg) =>
										setState((prev) => ({ ...prev, bg }))
									}
									disabled={saving}
								/>
							</div>
						</div>
						<BaseControl
							id={`${fieldIdPrefix}-fg`}
							label={__('Text color', 'modula-best-grid-gallery')}
							help={__(
								'Auto keeps text readable based on the selected tile background.',
								'modula-best-grid-gallery'
							)}
						>
							<div className="modula-content-block-edit__text-color-control">
								<div className="modula-content-block-edit__text-color-mode-row">
									<Button
										size="small"
										variant={
											useCustomTextColor
												? 'secondary'
												: 'primary'
										}
										onClick={() =>
											setState((prev) => ({
												...prev,
												fgHex: '',
											}))
										}
										disabled={saving}
									>
										{__('Auto', 'modula-best-grid-gallery')}
									</Button>
									<Button
										size="small"
										variant={
											useCustomTextColor
												? 'primary'
												: 'secondary'
										}
										onClick={() =>
											setState((prev) => ({
												...prev,
												fgHex: useCustomTextColor
													? prev.fgHex
													: effectiveTextColor,
											}))
										}
										disabled={saving}
									>
										{__(
											'Custom',
											'modula-best-grid-gallery'
										)}
									</Button>
								</div>
								{!useCustomTextColor ? (
									<div className="modula-content-block-edit__auto-scheme">
										<p className="modula-content-block-edit__hint modula-content-block-edit__hint--auto">
											{sprintf(
												/* translators: %s: computed text color hex value. */
												__(
													'Auto scheme active: %s',
													'modula-best-grid-gallery'
												),
												effectiveTextColor
											)}
										</p>
										<div className="modula-content-block-edit__auto-scheme-swatches">
											{textColorPalette.map((hex) => (
												<button
													key={hex}
													type="button"
													className="modula-content-block-edit__auto-swatch"
													style={{
														backgroundColor: hex,
														borderColor:
															hex ===
															effectiveTextColor
																? '#1d4ed8'
																: '#d0d5dd',
													}}
													onClick={() =>
														setState((prev) => ({
															...prev,
															fgHex: hex,
														}))
													}
													disabled={saving}
													aria-label={sprintf(
														/* translators: %s: color hex value. */
														__(
															'Use suggested text color %s',
															'modula-best-grid-gallery'
														),
														hex
													)}
													title={hex}
												/>
											))}
										</div>
									</div>
								) : (
									<div
										className={`modula-settings-editor__color-picker modula-settings-editor__color-picker--swatch${
											saving ? ' is-disabled' : ''
										}`}
									>
										<CompactColorControl
											variant="swatch"
											value={effectiveTextColor}
											onChange={(fgHex) =>
												setState((prev) => ({
													...prev,
													fgHex,
												}))
											}
											disabled={saving}
										/>
									</div>
								)}
							</div>
						</BaseControl>
					</div>
					<ContentBlockBackgroundFields
						state={state}
						setState={setState}
						disabled={saving}
						editorId={fieldIdPrefix}
					/>
				</div>
			</div>
		</GalleryModal>
	);
}

/**
 * @param {Object}                            props
 * @param {boolean}                           props.isOpen
 * @param {Function}                          props.onClose
 * @param {Object|null}                       props.initialRow Bootstrap / Redux content_block row.
 * @param {(fields: Object) => Promise<void>} props.onSave
 */
export default function ContentBlockEditModal({
	isOpen,
	onClose,
	initialRow,
	onSave,
}) {
	if (!isOpen || !initialRow) {
		return null;
	}

	const rowKey = contentBlockRowStableKey(initialRow);

	return (
		<ContentBlockEditModalBody
			key={rowKey}
			initialRow={initialRow}
			onClose={onClose}
			onSave={onSave}
		/>
	);
}
