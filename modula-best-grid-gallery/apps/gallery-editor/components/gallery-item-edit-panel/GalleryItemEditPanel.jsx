/**
 * Image edit sidebar panel — replaces metadata modal in settings column.
 */
import {
	getLayoutPolicy,
	getPreviewItemPageMoveAvailability,
	isGridItemLocked,
} from 'gallery-shared/preview';
import { useEffect, useId, useMemo } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import {
	ActionRow,
	Button,
	FieldStack,
	MetaSummary,
	Select,
	SettingsRow,
	StatePill,
	Switch,
	Textarea,
	TextInput,
} from 'shared-ui';
import { isWpTruthy } from '../../logic/wpTruthy';
import { useModulaSettingsEditorConfig } from '../../hooks/useModulaSettingsEditorConfig';
import {
	boundGalleryAllowsReplace,
	getBoundGalleryRemoveCopy,
	getBoundGallerySummaryFromEditor,
} from '../../utils/boundGalleryChromePolicy';
import { usePreviewReduxStoreItems } from '../../hooks/usePreviewReduxStoreItems';
import { useImageMetadataForm } from '../../form/useImageMetadataForm';
import { useGalleryItemMetadataAutosave } from '../../hooks/useGalleryItemMetadataAutosave';
import { useGallerySettingsFormBundle } from '../../form/GallerySettingsFormContext';
import { useGalleryItemEditSidebar } from '../../context/GalleryItemEditSidebarContext';
import { useGalleryPreviewAdminActionsOptional } from '../../hooks/useGalleryPreviewAdminActionsOptional';
import { buildImageMetadataPreviewChips } from '../../utils/imageMetadataPreviewMeta';
import { resolveGalleryAdminPostId } from '../../utils/resolveGalleryAdminPostId';
import { getEditableGalleryItemIndices } from '../../utils/galleryItemEditNavigation';
import { getGalleryPreviewReduxStore } from '../../utils/previewReduxStoreRef';
import { useModulaAiDescriptorSettingsQuery } from '../../query/useModulaAiDescriptorSettingsQuery';
import {
	imageMetadataAiFormKey,
	useImageMetadataAiGeneration,
} from '../../hooks/useImageMetadataAiGeneration';
import SettingsPanelHeader from '../sidebar/settings-panel/SettingsPanelHeader';
import SettingsPanelSection from '../sidebar/settings-panel/SettingsPanelSection';
import WatermarkActionButtonSlot from '../field/WatermarkActionButtonSlot';
import MetadataFiltersAutocompleteControl from '../field/MetadataFiltersAutocompleteControl';
import GalleryItemAiGenerateButton from './GalleryItemAiGenerateButton';
import ImageMetadataAiSparkleIcon from '../image-metadata-modal/ImageMetadataAiSparkleIcon';

const CLICK_INHERIT = 'inherit';
const CLICK_CUSTOM = 'custom';

const TRI_STATE_OPTIONS = [
	{ value: 'inherit', label: __('Inherit', 'modula-best-grid-gallery') },
	{ value: 'on', label: __('On', 'modula-best-grid-gallery') },
	{ value: 'off', label: __('Off', 'modula-best-grid-gallery') },
];

const CLICK_OPTIONS = [
	{
		value: CLICK_INHERIT,
		label: __('Uses the gallery setting', 'modula-best-grid-gallery'),
	},
	{
		value: CLICK_CUSTOM,
		label: __('Opens this address', 'modula-best-grid-gallery'),
	},
];

/**
 * @param {Object} props
 * @param {number} props.storeIndex
 */
export default function GalleryItemEditPanel({ storeIndex }) {
	const editor = useModulaSettingsEditorConfig();
	const boundSummary = getBoundGallerySummaryFromEditor(editor);
	const sourceRemoveCopy = getBoundGalleryRemoveCopy(boundSummary, {
		isSourceImage: true,
	});
	const allowReplace = boundGalleryAllowsReplace(boundSummary);
	const galleryId = resolveGalleryAdminPostId(editor);
	const { close, openFocus } = useGalleryItemEditSidebar() || {
		close: () => {},
		openFocus: () => {},
	};
	const adminActions = useGalleryPreviewAdminActionsOptional();
	const reduxItems = usePreviewReduxStoreItems(true);
	const { form: gallerySettingsForm } = useGallerySettingsFormBundle();
	const baseId = useId();

	const item = reduxItems[storeIndex] || null;
	const attachmentId = item?.id ? Number(item.id) : 0;

	const { form, mediaQuery } = useImageMetadataForm(
		Boolean(item),
		storeIndex,
		item,
		attachmentId
	);
	const media = mediaQuery.data;

	const { filtersGate, videoGate, exifGate, flush } =
		useGalleryItemMetadataAutosave({
			galleryId,
			storeIndex,
			attachmentId,
			item,
			form,
			enabled: Boolean(item && galleryId),
		});

	useEffect(() => {
		return () => {
			flush();
		};
		// Flush only on unmount / storeIndex change handled by remount key.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [storeIndex]);

	const aiSettingsQuery = useModulaAiDescriptorSettingsQuery({
		enabled: attachmentId > 0,
	});
	/* Query `select` already returns boolean (valid API key). */
	const aiConfigured = Boolean(aiSettingsQuery.data);
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

	const aiGenerateAllLabel = aiBusy
		? __('Generating…', 'modula-best-grid-gallery')
		: aiConfigured
			? __('Generate metadata with AI', 'modula-best-grid-gallery')
			: __('Configure Modula AI', 'modula-best-grid-gallery');

	/**
	 * @param {'title'|'alt'|'caption'} fieldKey
	 */
	const renderAiFieldEnd = (fieldKey) => {
		const formKey = imageMetadataAiFormKey(fieldKey);
		const suggested = aiSuggestedFields?.has?.(formKey);
		return (
			<span className="modula-gallery-item-edit-panel__ai-label-end">
				{suggested ? (
					<span className="modula-gallery-item-edit-panel__ai-badge">
						{__('AI suggestion', 'modula-best-grid-gallery')}
					</span>
				) : null}
				<GalleryItemAiGenerateButton
					busy={aiBusy}
					ariaLabel={
						fieldKey === 'title'
							? __('Generate title', 'modula-best-grid-gallery')
							: fieldKey === 'alt'
								? __(
										'Generate alt text',
										'modula-best-grid-gallery'
									)
								: __(
										'Generate caption',
										'modula-best-grid-gallery'
									)
					}
					onClick={() => generateField(fieldKey)}
				/>
			</span>
		);
	};

	const chips = useMemo(
		() => buildImageMetadataPreviewChips(item, media),
		[item, media]
	);

	const editableIndices = useMemo(
		() => getEditableGalleryItemIndices(reduxItems),
		[reduxItems]
	);
	const positionInEditable = editableIndices.indexOf(storeIndex);
	const positionLabel = sprintf(
		/* translators: 1: current index, 2: total */
		__('position %1$d of %2$d', 'modula-best-grid-gallery'),
		positionInEditable >= 0 ? positionInEditable + 1 : storeIndex + 1,
		Math.max(editableIndices.length, 1)
	);

	const metaLine = [chips.dimensions, chips.fileSize, positionLabel]
		.filter(Boolean)
		.join(' · ');

	const thumbSrc =
		item?.thumbnail ||
		item?.src ||
		item?.url ||
		media?.media_details?.sizes?.thumbnail?.source_url ||
		media?.source_url ||
		'';

	const enableExif = Boolean(
		gallerySettingsForm.state.values?.exif?.enableExif
	);
	const galleryType =
		gallerySettingsForm.state.values?.general?.type ||
		gallerySettingsForm.state.values?.type ||
		'';
	const showImageFocus = getLayoutPolicy({
		general: { type: galleryType },
	}).capabilities.imageFocus;
	const showVideo = videoGate.allowed;
	const showExif = exifGate.allowed && enableExif;
	const showFilters = filtersGate.allowed;

	const watermarkApplied = isWpTruthy(item?.watermarkApplied);
	const showWatermarkRow = Boolean(editor.isPro) || watermarkApplied;

	const showGridLock = galleryType === 'custom-grid';
	const gridLocked = showGridLock && isGridItemLocked(item);
	const pageMove = useMemo(() => {
		if (
			galleryType !== 'custom-grid' ||
			typeof adminActions?.moveItemToPreviousPage !== 'function'
		) {
			return { canPrevious: false, canNext: false };
		}
		const store = getGalleryPreviewReduxStore();
		const state = store?.getState?.();
		return getPreviewItemPageMoveAvailability(
			reduxItems,
			storeIndex,
			state?.gallery?.settings,
			state?.gallery?.config
		);
	}, [adminActions, galleryType, reduxItems, storeIndex]);
	const showPageMove = pageMove.canPrevious || pageMove.canNext;

	if (!item) {
		return (
			<div className="modula-settings-panel modula-gallery-item-edit-panel">
				<SettingsPanelHeader
					title={__('Image', 'modula-best-grid-gallery')}
					description={__(
						'This tile is no longer in the gallery.',
						'modula-best-grid-gallery'
					)}
					isNested
					parentTitle={__('Gallery', 'modula-best-grid-gallery')}
					onBack={close}
				/>
			</div>
		);
	}

	return (
		<div className="modula-settings-panel modula-gallery-item-edit-panel">
			<SettingsPanelHeader
				title={__('Image', 'modula-best-grid-gallery')}
				description={__(
					'Everything here applies to this one tile.',
					'modula-best-grid-gallery'
				)}
				isNested
				parentTitle={__('Gallery', 'modula-best-grid-gallery')}
				onBack={() => {
					flush();
					close();
				}}
			/>
			<div className="modula-settings-panel__scroll modula-gallery-item-edit-panel__scroll">
				<SettingsPanelSection
					label={__('This file', 'modula-best-grid-gallery')}
				>
					<MetaSummary
						thumbSrc={thumbSrc}
						thumbAlt={chips.filename || ''}
						title={
							chips.filename ||
							__('Image', 'modula-best-grid-gallery')
						}
						meta={metaLine}
					/>
					{showImageFocus ? (
						<Button
							variant="panel"
							mini
							className="modula-gallery-item-edit-panel__file-cta"
							onClick={() => openFocus(storeIndex)}
						>
							{__('Image focus', 'modula-best-grid-gallery')}
						</Button>
					) : null}
					{showGridLock ? (
						<div className="modula-gallery-item-edit-panel__lock-block">
							<div className="modula-gallery-item-edit-panel__lock-row">
								<span className="modula-gallery-item-edit-panel__lock-label">
									{__('Position', 'modula-best-grid-gallery')}
								</span>
								<StatePill active={gridLocked}>
									{gridLocked
										? __(
												'Locked',
												'modula-best-grid-gallery'
											)
										: __(
												'Unlocked',
												'modula-best-grid-gallery'
											)}
								</StatePill>
							</div>
							<Button
								variant="panel"
								mini
								className="modula-gallery-item-edit-panel__file-cta"
								disabled={!adminActions?.toggleGridItemLock}
								onClick={() =>
									adminActions?.toggleGridItemLock?.(
										storeIndex
									)
								}
							>
								{gridLocked
									? __(
											'Unlock position',
											'modula-best-grid-gallery'
										)
									: __(
											'Lock position',
											'modula-best-grid-gallery'
										)}
							</Button>
							<p className="modula-gallery-item-edit-panel__file-help">
								{__(
									'Locked tiles stay put when you rearrange the grid.',
									'modula-best-grid-gallery'
								)}
							</p>
						</div>
					) : null}
					<ActionRow>
						{allowReplace ? (
							<Button
								variant="ghost"
								disabled={!adminActions?.openReplaceMedia}
								onClick={() =>
									adminActions?.openReplaceMedia?.(storeIndex)
								}
							>
								{__(
									'Replace image',
									'modula-best-grid-gallery'
								)}
							</Button>
						) : null}
						<Button
							variant="ghost"
							className="modula-gallery-item-edit-panel__danger"
							disabled={!adminActions?.removeItem}
							confirm={sourceRemoveCopy.confirmLabel}
							onClick={() =>
								adminActions?.removeItem?.(storeIndex)
							}
						>
							{sourceRemoveCopy.isHide
								? __(
										'Hide from this gallery',
										'modula-best-grid-gallery'
									)
								: __(
										'Delete image',
										'modula-best-grid-gallery'
									)}
						</Button>
					</ActionRow>
					<p className="modula-gallery-item-edit-panel__file-help">
						{sourceRemoveCopy.isHide
							? __(
									'Hiding it here leaves the file on the bind target.',
									'modula-best-grid-gallery'
								)
							: __(
									'Deleting it here leaves the file in the media library.',
									'modula-best-grid-gallery'
								)}
					</p>
					{showPageMove ? (
						<ActionRow>
							<Button
								variant="ghost"
								disabled={!pageMove.canPrevious}
								onClick={() =>
									adminActions?.moveItemToPreviousPage?.(
										storeIndex
									)
								}
							>
								{__(
									'Previous page',
									'modula-best-grid-gallery'
								)}
							</Button>
							<Button
								variant="ghost"
								disabled={!pageMove.canNext}
								onClick={() =>
									adminActions?.moveItemToNextPage?.(
										storeIndex
									)
								}
							>
								{__('Next page', 'modula-best-grid-gallery')}
							</Button>
						</ActionRow>
					) : null}
				</SettingsPanelSection>

				<SettingsPanelSection
					label={__('Text', 'modula-best-grid-gallery')}
				>
					<div className="modula-gallery-item-edit-panel__ai-toolbar">
						<p className="modula-gallery-item-edit-panel__ai-hint">
							{__(
								'AI can create title, alt text and caption suggestions. You can review them before they autosave.',
								'modula-best-grid-gallery'
							)}
						</p>
						<Button
							variant="panel"
							mini
							disabled={aiBusy}
							className="modula-gallery-item-edit-panel__ai-btn"
							onClick={
								aiConfigured
									? generateAllMetadata
									: redirectToAiSettings
							}
						>
							<span
								className="modula-gallery-item-edit-panel__ai-btn-icon"
								aria-hidden="true"
							>
								<ImageMetadataAiSparkleIcon />
							</span>
							{aiGenerateAllLabel}
						</Button>
					</div>
					{aiStatus === 'success' ? (
						<p
							className="modula-gallery-item-edit-panel__ai-notice modula-gallery-item-edit-panel__ai-notice--success"
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
							className="modula-gallery-item-edit-panel__ai-notice modula-gallery-item-edit-panel__ai-notice--error"
							role="alert"
						>
							{__(
								'Could not generate metadata. Please try again.',
								'modula-best-grid-gallery'
							)}
						</p>
					) : null}
					<form.Field name="alt">
						{(field) => (
							<FieldStack
								label={__(
									'Alt text',
									'modula-best-grid-gallery'
								)}
								help={__(
									'Read aloud by screen readers and shown if the image fails to load.',
									'modula-best-grid-gallery'
								)}
								htmlFor={`${baseId}-alt`}
								labelEnd={renderAiFieldEnd('alt')}
							>
								<TextInput
									id={`${baseId}-alt`}
									value={field.state.value ?? ''}
									onChange={(v) => field.handleChange(v)}
								/>
							</FieldStack>
						)}
					</form.Field>
					<form.Field name="title">
						{(field) => (
							<FieldStack
								label={__('Title', 'modula-best-grid-gallery')}
								htmlFor={`${baseId}-title`}
								labelEnd={renderAiFieldEnd('title')}
							>
								<TextInput
									id={`${baseId}-title`}
									value={field.state.value ?? ''}
									onChange={(v) => field.handleChange(v)}
								/>
							</FieldStack>
						)}
					</form.Field>
					<form.Field name="description">
						{(field) => (
							<FieldStack
								label={__(
									'Caption',
									'modula-best-grid-gallery'
								)}
								htmlFor={`${baseId}-caption`}
								labelEnd={renderAiFieldEnd('caption')}
							>
								<Textarea
									id={`${baseId}-caption`}
									rows={3}
									value={field.state.value ?? ''}
									onChange={(v) => field.handleChange(v)}
								/>
							</FieldStack>
						)}
					</form.Field>
				</SettingsPanelSection>

				<SettingsPanelSection
					label={__('Link', 'modula-best-grid-gallery')}
				>
					<form.Subscribe selector={(s) => s.values.link}>
						{(linkValue) => {
							const clickMode =
								String(linkValue || '').trim() !== ''
									? CLICK_CUSTOM
									: CLICK_INHERIT;
							return (
								<>
									<FieldStack
										label={__(
											'Clicking this tile',
											'modula-best-grid-gallery'
										)}
										htmlFor={`${baseId}-click`}
									>
										<Select
											id={`${baseId}-click`}
											options={CLICK_OPTIONS}
											value={clickMode}
											onChange={(next) => {
												if (next === CLICK_INHERIT) {
													form.setFieldValue(
														'link',
														''
													);
												} else if (
													!String(
														form.state.values
															.link || ''
													).trim()
												) {
													form.setFieldValue(
														'link',
														'https://'
													);
												}
											}}
										/>
									</FieldStack>
									{clickMode === CLICK_CUSTOM ? (
										<form.Field name="link">
											{(field) => (
												<FieldStack
													label={__(
														'Address',
														'modula-best-grid-gallery'
													)}
													htmlFor={`${baseId}-link`}
												>
													<TextInput
														id={`${baseId}-link`}
														value={
															field.state.value ??
															''
														}
														placeholder="https://"
														onChange={(v) =>
															field.handleChange(
																v
															)
														}
													/>
												</FieldStack>
											)}
										</form.Field>
									) : (
										<FieldStack
											label={__(
												'Address',
												'modula-best-grid-gallery'
											)}
											htmlFor={`${baseId}-link`}
										>
											<TextInput
												id={`${baseId}-link`}
												value=""
												placeholder="https://"
												disabled
											/>
										</FieldStack>
									)}
								</>
							);
						}}
					</form.Subscribe>
					<form.Subscribe selector={(s) => s.values.link}>
						{(linkValue) => {
							const clickMode =
								String(linkValue || '').trim() !== ''
									? CLICK_CUSTOM
									: CLICK_INHERIT;

							// When the tile “Uses the gallery setting”, the per-image
							// “open in new tab” control is ignored/ambiguous. Hide it.
							if (clickMode !== CLICK_CUSTOM) {
								return null;
							}

							return (
								<form.Field name="target">
									{(field) => (
										<SettingsRow
											label={__(
												'Open link in a new browser tab',
												'modula-best-grid-gallery'
											)}
											end={
												<Switch
													checked={isWpTruthy(
														field.state.value
													)}
													onChange={(on) =>
														field.handleChange(
															on ? '1' : '0'
														)
													}
												/>
											}
										/>
									)}
								</form.Field>
							);
						}}
					</form.Subscribe>
				</SettingsPanelSection>

				<SettingsPanelSection
					label={__('Display', 'modula-best-grid-gallery')}
				>
					<form.Field name="togglelightbox">
						{(field) => (
							<SettingsRow
								label={__(
									'Hide image from lightbox',
									'modula-best-grid-gallery'
								)}
								end={
									<Switch
										checked={isWpTruthy(field.state.value)}
										onChange={(on) =>
											field.handleChange(on ? '1' : '0')
										}
									/>
								}
							/>
						)}
					</form.Field>
					<form.Field name="hide_title">
						{(field) => (
							<SettingsRow
								label={__(
									'Hide title',
									'modula-best-grid-gallery'
								)}
								end={
									<Switch
										checked={isWpTruthy(field.state.value)}
										onChange={(on) =>
											field.handleChange(on ? '1' : '0')
										}
									/>
								}
							/>
						)}
					</form.Field>
				</SettingsPanelSection>

				{showFilters ? (
					<SettingsPanelSection
						label={__('Filters', 'modula-best-grid-gallery')}
					>
						<form.Field name="filters">
							{(field) => (
								<MetadataFiltersAutocompleteControl
									value={field.state.value ?? ''}
									onChange={(v) => field.handleChange(v)}
								/>
							)}
						</form.Field>
					</SettingsPanelSection>
				) : null}

				{showVideo ? (
					<SettingsPanelSection
						label={__('Video', 'modula-best-grid-gallery')}
					>
						<form.Field name="video_url">
							{(field) => (
								<FieldStack
									label={__(
										'Video URL',
										'modula-best-grid-gallery'
									)}
									htmlFor={`${baseId}-video-url`}
								>
									<TextInput
										id={`${baseId}-video-url`}
										value={field.state.value ?? ''}
										onChange={(v) => field.handleChange(v)}
									/>
								</FieldStack>
							)}
						</form.Field>
						<form.Field name="video_thumbnail">
							{(field) => (
								<FieldStack
									label={__(
										'Video thumbnail URL',
										'modula-best-grid-gallery'
									)}
									htmlFor={`${baseId}-video-thumb`}
								>
									<TextInput
										id={`${baseId}-video-thumb`}
										value={field.state.value ?? ''}
										onChange={(v) => field.handleChange(v)}
									/>
								</FieldStack>
							)}
						</form.Field>
						<form.Field name="autoplay_thumbnail">
							{(field) => (
								<FieldStack
									label={__(
										'Autoplay thumbnail',
										'modula-best-grid-gallery'
									)}
									htmlFor={`${baseId}-ap-thumb`}
								>
									<Select
										id={`${baseId}-ap-thumb`}
										options={TRI_STATE_OPTIONS}
										value={field.state.value || 'inherit'}
										onChange={(v) => field.handleChange(v)}
									/>
								</FieldStack>
							)}
						</form.Field>
						<form.Field name="autoplay_lightbox">
							{(field) => (
								<FieldStack
									label={__(
										'Autoplay in lightbox',
										'modula-best-grid-gallery'
									)}
									htmlFor={`${baseId}-ap-lb`}
								>
									<Select
										id={`${baseId}-ap-lb`}
										options={TRI_STATE_OPTIONS}
										value={field.state.value || 'inherit'}
										onChange={(v) => field.handleChange(v)}
									/>
								</FieldStack>
							)}
						</form.Field>
						<form.Field name="loop_video">
							{(field) => (
								<FieldStack
									label={__(
										'Loop video',
										'modula-best-grid-gallery'
									)}
									htmlFor={`${baseId}-loop`}
								>
									<Select
										id={`${baseId}-loop`}
										options={TRI_STATE_OPTIONS}
										value={field.state.value || 'inherit'}
										onChange={(v) => field.handleChange(v)}
									/>
								</FieldStack>
							)}
						</form.Field>
					</SettingsPanelSection>
				) : null}

				{showExif ? (
					<SettingsPanelSection
						label={__('EXIF', 'modula-best-grid-gallery')}
					>
						{[
							[
								'exif_camera',
								__('Camera model', 'modula-best-grid-gallery'),
							],
							[
								'exif_lens',
								__('Lens', 'modula-best-grid-gallery'),
							],
							[
								'exif_focal_length',
								__('Focal length', 'modula-best-grid-gallery'),
							],
							[
								'exif_shutter_speed',
								__('Shutter speed', 'modula-best-grid-gallery'),
							],
							[
								'exif_aperture',
								__('Aperture', 'modula-best-grid-gallery'),
							],
							['exif_iso', __('ISO', 'modula-best-grid-gallery')],
							[
								'exif_date',
								__('Date taken', 'modula-best-grid-gallery'),
							],
						].map(([key, label]) => (
							<form.Field key={key} name={key}>
								{(field) => (
									<FieldStack
										label={label}
										htmlFor={`${baseId}-${key}`}
									>
										<TextInput
											id={`${baseId}-${key}`}
											value={field.state.value ?? ''}
											onChange={(v) =>
												field.handleChange(v)
											}
										/>
									</FieldStack>
								)}
							</form.Field>
						))}
					</SettingsPanelSection>
				) : null}

				{showWatermarkRow ? (
					<SettingsPanelSection
						label={__('Watermark', 'modula-best-grid-gallery')}
					>
						<div className="modula-gallery-item-edit-panel__wm-block">
							<div className="modula-gallery-item-edit-panel__wm-row">
								<span className="modula-gallery-item-edit-panel__wm-label">
									{__(
										'On this image',
										'modula-best-grid-gallery'
									)}
								</span>
								<StatePill active={watermarkApplied}>
									{watermarkApplied
										? __(
												'Applied',
												'modula-best-grid-gallery'
											)
										: __(
												'Not applied',
												'modula-best-grid-gallery'
											)}
								</StatePill>
							</div>
							{attachmentId > 0 ? (
								<div className="modula-gallery-item-edit-panel__wm-actions">
									<WatermarkActionButtonSlot
										action="apply_watermark"
										buttonLabel={__(
											'Apply on image',
											'modula-best-grid-gallery'
										)}
										imageId={attachmentId}
										mini
										disabled={!attachmentId}
									/>
									<WatermarkActionButtonSlot
										action="remove_watermark"
										buttonLabel={__(
											'Remove from image',
											'modula-best-grid-gallery'
										)}
										imageId={attachmentId}
										mini
										disabled={!attachmentId}
									/>
								</div>
							) : null}
						</div>
					</SettingsPanelSection>
				) : null}
			</div>
		</div>
	);
}
