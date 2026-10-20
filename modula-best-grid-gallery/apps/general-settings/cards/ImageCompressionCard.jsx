import { __ } from '@wordpress/i18n';
import {
	IconNote,
	Segmented,
	SettingsRow,
	Toggle,
	rowHelpId,
	rowLabelId,
} from 'admin-ui';
import { fieldLabel, fieldsByName } from '../model/settingsPageModel';
import { CardFrame } from '../page/CardFrame';
import { UnavailableCard } from '../page/UnavailableCard';
import { useCardValues } from '../page/useCardValues';
import { compressionChoices } from './compressionChoices';

// The settings class's fields in the modula_speedup option.
const TOGGLE_FIELD = 'enable_optimization';
const ID_PREFIX = 'modula-image-compression';

// The two compression types, each a segmented control: field name and control id.
const COMPRESSION_TYPES = [
	{ name: 'thumbnail_optimization', id: `${ID_PREFIX}-thumbnails` },
	{ name: 'lightbox_optimization', id: `${ID_PREFIX}-lightbox` },
];

/**
 * Image compression (Performance): the Compression toggle and, while it is
 * on, the thumbnail and lightbox compression types. The settings class
 * disables every field when compression cannot run on this site (not a
 * production environment); the card then shows why, under its last row.
 *
 * @param {Object} props
 * @param {Object} props.card Projected settings card.
 */
export function ImageCompressionCard({ card }) {
	const { values, setValue } = useCardValues(card);
	const fields = fieldsByName(card.config);
	const toggleField = fields[TOGGLE_FIELD];

	if (!toggleField) {
		return <UnavailableCard card={card} />;
	}

	const isAvailable = true !== toggleField.disabled;
	const isOn = values[TOGGLE_FIELD] === toggleField.trueValue;
	const toggleId = `${ID_PREFIX}-enabled`;
	const types = isOn
		? COMPRESSION_TYPES.filter((type) => fields[type.name])
		: [];
	// The note sits inside the card under the last row, as in the design
	// (not under the card like CardFrame's note), and describes every control.
	const lastRowId = 0 < types.length ? types[types.length - 1].id : toggleId;
	const note = isAvailable ? null : (
		<IconNote>
			{__('Not available on a local site.', 'modula-best-grid-gallery')}
		</IconNote>
	);
	const noteId = note ? rowHelpId(lastRowId) : undefined;

	return (
		<CardFrame card={card}>
			<SettingsRow
				label={fieldLabel(card.config, TOGGLE_FIELD)}
				controlId={toggleId}
				help={lastRowId === toggleId ? note : null}
			>
				<Toggle
					id={toggleId}
					checked={isOn}
					disabled={!isAvailable}
					onChange={(checked) =>
						setValue(
							TOGGLE_FIELD,
							checked
								? toggleField.trueValue
								: toggleField.falseValue
						)
					}
					aria-describedby={noteId}
				/>
			</SettingsRow>
			{types.map((type) => (
				<SettingsRow
					key={type.name}
					label={fieldLabel(card.config, type.name)}
					controlId={type.id}
					labelElement="span"
					help={lastRowId === type.id ? note : null}
				>
					<Segmented
						options={compressionChoices(fields[type.name].options)}
						value={values[type.name] ?? ''}
						disabled={!isAvailable}
						onChange={(value) => setValue(type.name, value)}
						aria-labelledby={rowLabelId(type.id)}
						aria-describedby={noteId}
					/>
				</SettingsRow>
			))}
		</CardFrame>
	);
}
