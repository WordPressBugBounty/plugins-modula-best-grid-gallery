import { decodeEntities } from '@wordpress/html-entities';
import { IconNote, Select, SettingsRow, rowHelpId } from 'admin-ui';
import { fieldsByName } from '../model/settingsPageModel';
import { CardFrame } from '../page/CardFrame';
import { UnavailableCard } from '../page/UnavailableCard';
import { useCardValues } from '../page/useCardValues';

// Pro's Default preset field (modula_new_galleries option).
const PRESET_FIELD = 'default_gallery_preset';
const ID = 'modula-new-galleries-preset';

/**
 * New galleries (Pro, no design): the Default preset select, with Pro's
 * own label and help. Pro rejects an unknown preset on save; the page shows
 * that error. If Pro sends another shape, the card shows as unavailable.
 *
 * @param {Object} props
 * @param {Object} props.card Projected settings card.
 */
export function NewGalleriesCard({ card }) {
	const { values, setValue } = useCardValues(card);
	const fields = fieldsByName(card.config);
	const field = fields[PRESET_FIELD];

	if (!field) {
		return <UnavailableCard card={card} />;
	}

	// Pro adds this paragraph when the stored preset was trashed or deleted;
	// its description is escaped as HTML, so decode it for React text.
	const missingNotice = fields[`${PRESET_FIELD}_notice`];
	const presets = (field.options || []).map((option) => ({
		value: String(option.value),
		label: option.label,
	}));

	return (
		<CardFrame
			card={card}
			note={
				missingNotice ? (
					<IconNote>
						<strong>{missingNotice.label}.</strong>{' '}
						{decodeEntities(missingNotice.description)}
					</IconNote>
				) : null
			}
		>
			<SettingsRow
				label={field.label}
				controlId={ID}
				help={field.description}
			>
				<Select
					id={ID}
					options={presets}
					value={String(values[PRESET_FIELD] ?? 0)}
					// The option stores a preset ID; Pro validates it.
					onChange={(value) => setValue(PRESET_FIELD, Number(value))}
					aria-describedby={rowHelpId(ID)}
				/>
			</SettingsRow>
		</CardFrame>
	);
}
