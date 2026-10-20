import { __ } from '@wordpress/i18n';
import {
	ImagePicker,
	Range,
	Select,
	SettingsRow,
	TextInput,
	Toggle,
	rowHelpId,
	rowLabelId,
} from 'admin-ui';
import {
	fieldLabel,
	fieldsByName,
	storedBoolean,
} from '../model/settingsPageModel';
import { CardFrame } from '../page/CardFrame';
import { UnavailableCard } from '../page/UnavailableCard';
import {
	attachmentIdOf,
	hasMediaLibrary,
	useImageLibrary,
	useImagePreview,
} from '../page/mediaLibrary';
import { useCardValues } from '../page/useCardValues';

// The settings class's fields in the modula_watermark option.
const FIELDS = {
	image: 'watermark_image',
	position: 'watermark_position',
	margin: 'watermark_margin',
	width: 'watermark_image_dimension_width',
	height: 'watermark_image_dimension_height',
	backup: 'watermark_enable_backup',
};
const ID_PREFIX = 'modula-watermark';

/**
 * Watermark (Protection, no design): the watermark image, its position,
 * margin and size, and whether originals are kept. A Business card, locked
 * in Lite. If the settings class sends another shape, the card shows as
 * unavailable.
 *
 * @param {Object} props
 * @param {Object} props.card Projected settings card.
 */
export function WatermarkCard({ card }) {
	const { values, setValue } = useCardValues(card);
	const fields = fieldsByName(card.config);
	const isComplete = Object.values(FIELDS).every((name) => fields[name]);
	const imageId = attachmentIdOf(values[FIELDS.image]);
	// Hooks run before the fallback below; the image field may be missing.
	const preview = useImagePreview(imageId, fields[FIELDS.image] ?? {});
	const openLibrary = useImageLibrary({
		title: __('Choose a watermark image', 'modula-best-grid-gallery'),
		buttonText: __('Use this image', 'modula-best-grid-gallery'),
		onSelect: ({ id, src }) => {
			preview.remember(id, src);
			setValue(FIELDS.image, id);
		},
	});

	if (!isComplete) {
		return <UnavailableCard card={card} />;
	}

	// Control ids, by the same keys as FIELDS.
	const ids = Object.fromEntries(
		Object.keys(FIELDS).map((key) => [key, `${ID_PREFIX}-${key}`])
	);
	// Row labels, by the same keys, as the settings class names the fields.
	const labels = Object.fromEntries(
		Object.entries(FIELDS).map(([key, name]) => [
			key,
			fieldLabel(card.config, name),
		])
	);
	const marginField = fields[FIELDS.margin];
	const margin = Number(values[FIELDS.margin]);

	return (
		<CardFrame card={card}>
			<SettingsRow
				label={labels.image}
				controlId={ids.image}
				labelElement="span"
			>
				<ImagePicker
					src={preview.src}
					alt={labels.image}
					chooseLabel={__('Choose image', 'modula-best-grid-gallery')}
					replaceLabel={__('Replace', 'modula-best-grid-gallery')}
					removeLabel={__('Remove', 'modula-best-grid-gallery')}
					disabled={!hasMediaLibrary()}
					onChoose={openLibrary}
					// The number sanitizer stores no image as 0.
					onRemove={() => setValue(FIELDS.image, 0)}
					aria-labelledby={rowLabelId(ids.image)}
				/>
			</SettingsRow>
			<SettingsRow label={labels.position} controlId={ids.position}>
				<Select
					id={ids.position}
					options={fields[FIELDS.position].options || []}
					value={String(values[FIELDS.position] ?? '')}
					onChange={(value) => setValue(FIELDS.position, value)}
				/>
			</SettingsRow>
			<SettingsRow
				label={labels.margin}
				controlId={ids.margin}
				help={__(
					'Space between the watermark and the edge of the image.',
					'modula-best-grid-gallery'
				)}
			>
				<Range
					id={ids.margin}
					min={marginField.min}
					max={marginField.max}
					value={Number.isFinite(margin) ? margin : marginField.min}
					unit="px"
					onChange={(value) => setValue(FIELDS.margin, value)}
					aria-describedby={rowHelpId(ids.margin)}
				/>
			</SettingsRow>
			<SettingsRow label={labels.width} controlId={ids.width}>
				<TextInput
					id={ids.width}
					type="number"
					min={0}
					value={String(values[FIELDS.width] ?? '')}
					onChange={(value) => setValue(FIELDS.width, value)}
					// The help under Height explains both sizes.
					aria-describedby={rowHelpId(ids.height)}
				/>
			</SettingsRow>
			<SettingsRow
				label={labels.height}
				controlId={ids.height}
				help={__(
					'In pixels. Set one to 0 to keep the proportions, or both to 0 to use the image’s own size.',
					'modula-best-grid-gallery'
				)}
			>
				<TextInput
					id={ids.height}
					type="number"
					min={0}
					value={String(values[FIELDS.height] ?? '')}
					onChange={(value) => setValue(FIELDS.height, value)}
					aria-describedby={rowHelpId(ids.height)}
				/>
			</SettingsRow>
			<SettingsRow
				label={labels.backup}
				controlId={ids.backup}
				help={__(
					'Saves a copy of each image before the watermark is added, so you can restore the originals later.',
					'modula-best-grid-gallery'
				)}
			>
				<Toggle
					id={ids.backup}
					checked={storedBoolean(values[FIELDS.backup])}
					onChange={(checked) => setValue(FIELDS.backup, checked)}
					aria-describedby={rowHelpId(ids.backup)}
				/>
			</SettingsRow>
		</CardFrame>
	);
}
