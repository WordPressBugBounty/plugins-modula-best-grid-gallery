/**
 * Image edit panel — "More settings": Video, EXIF, Watermark and Advanced
 * (the CSS class) as sections that start collapsed. Their open state lives in the settings panel's
 * sections context, so it survives previous/next and leaving the panel.
 */
import { useId } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import {
	Accordion,
	AccordionSection,
	rowLabelId,
	Segmented,
	SettingsRow,
	TextInput,
} from 'admin-ui';
import { useSettingsPanelSections } from '../../context/SettingsPanelSectionsContext';
import WatermarkActionButtonSlot from '../field/WatermarkActionButtonSlot';
import { ITEM_CSS_CLASS_KEY } from '../../utils/galleryItemFields';
import ImageEditCssClassField from './ImageEditCssClassField';
import ItemEditField from './ItemEditField';

/** Open-state keys, apart from the settings panel's `category/…` keys. */
const SECTION_KEY_PREFIX = 'item-edit/';

const TRI_STATE_OPTIONS = [
	{ value: 'inherit', label: __('Default', 'modula-best-grid-gallery') },
	{ value: 'on', label: __('On', 'modula-best-grid-gallery') },
	{ value: 'off', label: __('Off', 'modula-best-grid-gallery') },
];

const VIDEO_TEXT_FIELDS = [
	{ name: 'video_url', label: __('Video URL', 'modula-best-grid-gallery') },
	{
		name: 'video_thumbnail',
		label: __('Video thumbnail URL', 'modula-best-grid-gallery'),
	},
];

const VIDEO_TRI_STATE_FIELDS = [
	{
		name: 'autoplay_thumbnail',
		label: __('Autoplay thumbnail', 'modula-best-grid-gallery'),
	},
	{
		name: 'autoplay_lightbox',
		label: __('Autoplay in lightbox', 'modula-best-grid-gallery'),
	},
	{ name: 'loop_video', label: __('Loop video', 'modula-best-grid-gallery') },
];

const EXIF_FIELDS = [
	{
		name: 'exif_camera',
		label: __('Camera model', 'modula-best-grid-gallery'),
	},
	{ name: 'exif_lens', label: __('Lens', 'modula-best-grid-gallery') },
	{
		name: 'exif_focal_length',
		label: __('Focal length', 'modula-best-grid-gallery'),
	},
	{
		name: 'exif_shutter_speed',
		label: __('Shutter speed', 'modula-best-grid-gallery'),
	},
	{
		name: 'exif_aperture',
		label: __('Aperture', 'modula-best-grid-gallery'),
	},
	{ name: 'exif_iso', label: __('ISO', 'modula-best-grid-gallery') },
	{ name: 'exif_date', label: __('Date taken', 'modula-best-grid-gallery') },
];

/**
 * @param {Object}                    props
 * @param {string}                    props.id    Section id under `item-edit/`.
 * @param {string}                    props.title
 * @param {import('react').ReactNode} props.children
 */
function MoreSection({ id, title, children }) {
	const { openSections, setSectionOpen } = useSettingsPanelSections();
	const key = `${SECTION_KEY_PREFIX}${id}`;
	return (
		<AccordionSection
			title={title}
			open={openSections[key] === true}
			onOpenChange={(open) => setSectionOpen(key, open)}
		>
			{children}
		</AccordionSection>
	);
}

/**
 * @param {Object}                     props
 * @param {Object}                     props.form
 * @param {{ name: string, label: string }[]} props.fields
 * @param {string}                     props.baseId
 */
function TextFields({ form, fields, baseId }) {
	return fields.map(({ name, label }) => (
		<form.Field key={name} name={name}>
			{(field) => (
				<ItemEditField label={label} controlId={`${baseId}-${name}`}>
					<TextInput
						id={`${baseId}-${name}`}
						value={field.state.value ?? ''}
						onChange={(v) => field.handleChange(v)}
					/>
				</ItemEditField>
			)}
		</form.Field>
	));
}

/**
 * @param {Object} props
 * @param {Object} props.form
 * @param {string} props.baseId
 */
function VideoFields({ form, baseId }) {
	return (
		<>
			<TextFields
				form={form}
				fields={VIDEO_TEXT_FIELDS}
				baseId={baseId}
			/>
			{VIDEO_TRI_STATE_FIELDS.map(({ name, label }) => (
				<form.Field key={name} name={name}>
					{(field) => (
						<SettingsRow
							label={label}
							controlId={`${baseId}-${name}`}
							labelElement="span"
						>
							<Segmented
								aria-labelledby={rowLabelId(
									`${baseId}-${name}`
								)}
								options={TRI_STATE_OPTIONS}
								value={field.state.value || 'inherit'}
								onChange={(v) => field.handleChange(v)}
							/>
						</SettingsRow>
					)}
				</form.Field>
			))}
		</>
	);
}

/**
 * @param {Object}  props
 * @param {number}  props.attachmentId
 * @param {boolean} props.applied      The item's `watermarkApplied`.
 */
function WatermarkFields({ attachmentId, applied }) {
	return (
		<div className="modula-gallery-item-edit-panel__watermark">
			<p className="modula-gallery-item-edit-panel__watermark-status">
				<span>{__('On this image', 'modula-best-grid-gallery')}</span>
				<span className="modula-gallery-item-edit-panel__watermark-state">
					{applied
						? __('Applied', 'modula-best-grid-gallery')
						: __('Not applied', 'modula-best-grid-gallery')}
				</span>
			</p>
			{attachmentId > 0 ? (
				<div className="modula-gallery-item-edit-panel__watermark-actions">
					<WatermarkActionButtonSlot
						action="apply_watermark"
						buttonLabel={__(
							'Apply on image',
							'modula-best-grid-gallery'
						)}
						imageId={attachmentId}
						mini
					/>
					<WatermarkActionButtonSlot
						action="remove_watermark"
						buttonLabel={__(
							'Remove from image',
							'modula-best-grid-gallery'
						)}
						imageId={attachmentId}
						mini
					/>
				</div>
			) : null}
		</div>
	);
}

/**
 * @param {Object}  props
 * @param {Object}  props.form             Image metadata form.
 * @param {number}  props.attachmentId
 * @param {boolean} props.showVideo
 * @param {boolean} props.showExif
 * @param {boolean} props.showWatermark
 * @param {boolean} props.watermarkApplied
 */
export default function ImageEditMoreSettings({
	form,
	attachmentId,
	showVideo,
	showExif,
	showWatermark,
	watermarkApplied,
}) {
	const baseId = `modula-item-more-${useId()}`;
	return (
		<section
			className="modula-settings-panel__more"
			aria-labelledby={`${baseId}-title`}
		>
			<h2
				id={`${baseId}-title`}
				className="modula-settings-panel__more-title"
			>
				{__('More settings', 'modula-best-grid-gallery')}
			</h2>
			<Accordion className="modula-settings-panel__more-sections">
				{showVideo ? (
					<MoreSection
						id="video"
						title={__('Video', 'modula-best-grid-gallery')}
					>
						<VideoFields form={form} baseId={baseId} />
					</MoreSection>
				) : null}
				{showExif ? (
					<MoreSection
						id="exif"
						title={__('EXIF', 'modula-best-grid-gallery')}
					>
						<TextFields
							form={form}
							fields={EXIF_FIELDS}
							baseId={baseId}
						/>
					</MoreSection>
				) : null}
				{showWatermark ? (
					<MoreSection
						id="watermark"
						title={__('Watermark', 'modula-best-grid-gallery')}
					>
						<WatermarkFields
							attachmentId={attachmentId}
							applied={watermarkApplied}
						/>
					</MoreSection>
				) : null}
				<MoreSection
					id="advanced"
					title={__('Advanced', 'modula-best-grid-gallery')}
				>
					<form.Field name={ITEM_CSS_CLASS_KEY}>
						{(field) => (
							<ImageEditCssClassField
								value={field.state.value ?? ''}
								onChange={(v) => field.handleChange(v)}
							/>
						)}
					</form.Field>
				</MoreSection>
			</Accordion>
		</section>
	);
}
