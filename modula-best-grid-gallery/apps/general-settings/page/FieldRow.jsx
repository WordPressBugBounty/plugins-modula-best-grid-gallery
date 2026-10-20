import { decodeEntities } from '@wordpress/html-entities';
import { __, sprintf } from '@wordpress/i18n';
import {
	ImagePicker,
	Range,
	Select,
	SettingsRow,
	TextInput,
	Textarea,
	Toggle,
	TokenPicker,
	rowHelpId,
	rowLabelId,
} from 'admin-ui';
import {
	conditionsMet,
	storedBoolean,
	valueAtPath,
} from '../model/settingsPageModel';
import { chosenPostIds } from '../cards/postPicker';
import { usePostPicker } from '../cards/usePostPicker';
import { decodedText } from '../cards/serverText';
import { CardNotice } from './CardNotice';
import {
	attachmentIdOf,
	hasMediaLibrary,
	useImageLibrary,
	useImagePreview,
} from './mediaLibrary';
import { useDevelopmentError } from './useDevelopmentError';

/**
 * @typedef {Object} FieldRowProps
 * @property {Object}   field    Config field.
 * @property {*}        value    Its current value.
 * @property {Function} onChange Receives the new value.
 * @property {string}   id       Control id.
 * @property {Object}   values   The card's values (a combo's sub-fields read them).
 * @property {Function} setValue Card setter (name, value).
 * @property {string}   idPrefix Prefix of the card's control ids.
 */

/**
 * The field's help under its row. The settings class and Pro escape it as
 * HTML, so it is decoded for React text.
 *
 * @param {Object} field Config field.
 * @param {string} id    Control id.
 * @return {{ help: string|null, describedBy: string|undefined }} Help, and the id that names it.
 */
function rowHelp(field, id) {
	const help = field.description ? decodeEntities(field.description) : null;

	return { help, describedBy: help ? rowHelpId(id) : undefined };
}

/**
 * @param {Object} field Config field.
 * @return {boolean} Whether the settings class sent the field read-only.
 */
function isDisabled(field) {
	return true === field.disabled || true === field.readonly;
}

/**
 * @param {FieldRowProps} props
 */
function ToggleRow({ field, value, onChange, id }) {
	const { help, describedBy } = rowHelp(field, id);

	return (
		<SettingsRow
			label={decodedText(field.label)}
			controlId={id}
			help={help}
		>
			<Toggle
				id={id}
				checked={storedBoolean(value)}
				disabled={isDisabled(field)}
				onChange={onChange}
				aria-describedby={describedBy}
			/>
		</SettingsRow>
	);
}

/**
 * A toggle that stores the field's own on and off values.
 *
 * @param {FieldRowProps} props
 */
function OptionsToggleRow({ field, value, onChange, id }) {
	const { help, describedBy } = rowHelp(field, id);

	return (
		<SettingsRow
			label={decodedText(field.label)}
			controlId={id}
			help={help}
		>
			<Toggle
				id={id}
				checked={value === field.trueValue}
				disabled={isDisabled(field)}
				onChange={(checked) =>
					onChange(checked ? field.trueValue : field.falseValue)
				}
				aria-describedby={describedBy}
			/>
		</SettingsRow>
	);
}

/**
 * @param {FieldRowProps} props
 */
function TextRow({ field, value, onChange, id }) {
	const { help, describedBy } = rowHelp(field, id);

	return (
		<SettingsRow
			label={decodedText(field.label)}
			controlId={id}
			help={help}
		>
			<TextInput
				id={id}
				type={field.inputType || 'text'}
				placeholder={field.placeholder}
				value={String(value ?? '')}
				disabled={isDisabled(field)}
				onChange={onChange}
				aria-describedby={describedBy}
			/>
		</SettingsRow>
	);
}

/**
 * @param {FieldRowProps} props
 */
function NumberRow({ field, value, onChange, id }) {
	const { help, describedBy } = rowHelp(field, id);

	return (
		<SettingsRow
			label={decodedText(field.label)}
			controlId={id}
			help={help}
		>
			<TextInput
				id={id}
				type="number"
				min={field.min}
				max={field.max}
				value={String(value ?? '')}
				disabled={isDisabled(field)}
				onChange={onChange}
				aria-describedby={describedBy}
			/>
		</SettingsRow>
	);
}

/**
 * @param {FieldRowProps} props
 */
function TextareaRow({ field, value, onChange, id }) {
	const { help, describedBy } = rowHelp(field, id);

	return (
		<SettingsRow
			label={decodedText(field.label)}
			controlId={id}
			help={help}
			stacked
		>
			<Textarea
				id={id}
				rows={3}
				value={'string' === typeof value ? value : ''}
				disabled={isDisabled(field)}
				onChange={onChange}
				aria-describedby={describedBy}
			/>
		</SettingsRow>
	);
}

/**
 * HTML source, edited as monospace text.
 *
 * @param {FieldRowProps} props
 */
function CodeRow({ field, value, onChange, id }) {
	const { help, describedBy } = rowHelp(field, id);

	return (
		<SettingsRow
			label={decodedText(field.label)}
			controlId={id}
			help={help}
			stacked
		>
			<Textarea
				id={id}
				rows={8}
				className="modula-settings-code-field"
				value={'string' === typeof value ? value : ''}
				disabled={isDisabled(field)}
				onChange={onChange}
				aria-describedby={describedBy}
			/>
		</SettingsRow>
	);
}

/**
 * A select from `{ value, label }` options, or a license choice
 * (`ia_radio`) from `{ value, name }` options, drawn as a select as in the
 * Image licensing card.
 *
 * @param {FieldRowProps} props
 */
function SelectRow({ field, value, onChange, id }) {
	const { help, describedBy } = rowHelp(field, id);
	const options = (field.options || []).map((option) => ({
		value: String(option.value),
		label: decodedText(option.label ?? option.name),
	}));

	return (
		<SettingsRow
			label={decodedText(field.label)}
			controlId={id}
			help={help}
		>
			<Select
				id={id}
				options={options}
				value={String(value ?? '')}
				disabled={isDisabled(field)}
				onChange={onChange}
				aria-describedby={describedBy}
			/>
		</SettingsRow>
	);
}

/**
 * @param {FieldRowProps} props
 */
function RangeRow({ field, value, onChange, id }) {
	const { help, describedBy } = rowHelp(field, id);
	const min = field.min ?? 0;
	const number = Number(value);

	return (
		<SettingsRow
			label={decodedText(field.label)}
			controlId={id}
			help={help}
		>
			<Range
				id={id}
				min={min}
				max={field.max ?? 100}
				step={field.step}
				value={Number.isFinite(number) ? number : min}
				disabled={isDisabled(field)}
				onChange={onChange}
				aria-describedby={describedBy}
			/>
		</SettingsRow>
	);
}

/**
 * An image from the media library, stored as its attachment ID.
 *
 * @param {FieldRowProps} props
 */
function ImageRow({ field, value, onChange, id }) {
	const { help, describedBy } = rowHelp(field, id);
	const preview = useImagePreview(attachmentIdOf(value), field);
	const openLibrary = useImageLibrary({
		title: __('Choose an image', 'modula-best-grid-gallery'),
		buttonText: __('Use this image', 'modula-best-grid-gallery'),
		onSelect: ({ id: imageId, src }) => {
			preview.remember(imageId, src);
			onChange(imageId);
		},
	});

	return (
		<SettingsRow
			label={decodedText(field.label)}
			controlId={id}
			help={help}
			labelElement="span"
		>
			<ImagePicker
				src={preview.src}
				alt={decodedText(field.label)}
				chooseLabel={__('Choose image', 'modula-best-grid-gallery')}
				replaceLabel={__('Replace', 'modula-best-grid-gallery')}
				removeLabel={__('Remove', 'modula-best-grid-gallery')}
				disabled={isDisabled(field) || !hasMediaLibrary()}
				onChoose={openLibrary}
				// The number sanitizer stores no image as 0.
				onRemove={() => onChange(0)}
				aria-labelledby={rowLabelId(id)}
				aria-describedby={describedBy}
			/>
		</SettingsRow>
	);
}

/**
 * Posts and pages chosen by search, stored as their IDs.
 *
 * @param {FieldRowProps} props
 */
function PostPickerRow({ field, value, onChange, id }) {
	const { help, describedBy } = rowHelp(field, id);
	const ids = chosenPostIds(value);
	const picker = usePostPicker({ ids, items: field.items });

	return (
		<SettingsRow
			label={decodedText(field.label)}
			controlId={id}
			help={help}
			stacked
		>
			<TokenPicker
				id={id}
				tokens={picker.tokens}
				onRemove={(removed) =>
					onChange(ids.filter((postId) => postId !== removed))
				}
				query={picker.query}
				onQueryChange={picker.setQuery}
				suggestions={picker.suggestions}
				onPick={(option) => {
					picker.remember(option);
					onChange([...ids, option.value]);
				}}
				status={picker.status}
				placeholder={__(
					'Search posts and pages',
					'modula-best-grid-gallery'
				)}
				removeLabel={(label) =>
					/* translators: %s: post or page title. */
					sprintf(__('Remove %s', 'modula-best-grid-gallery'), label)
				}
				disabled={isDisabled(field)}
				aria-describedby={describedBy}
			/>
		</SettingsRow>
	);
}

/**
 * Text from the settings class, with its heading when it has one.
 *
 * @param {FieldRowProps} props
 */
function ParagraphRow({ field }) {
	return (
		<div className="modula-settings-card-message">
			{field.label ? <strong>{decodedText(field.label)} </strong> : null}
			{field.description ? (
				// Built and escaped by the settings class (links, emphasis).
				<span dangerouslySetInnerHTML={{ __html: field.description }} />
			) : null}
		</div>
	);
}

/**
 * A combo's sub-fields, each its own row, shown while its conditions hold.
 *
 * @param {FieldRowProps} props
 */
function ComboRows({ field, values, setValue, idPrefix }) {
	return (
		<FieldRows
			fields={field.fields || []}
			values={values}
			setValue={setValue}
			idPrefix={idPrefix}
		/>
	);
}

/**
 * The admin-ui row for each config field kind the settings class or Pro
 * sends that any card can show. The other kinds (button, checkbox_group,
 * oauth, credentials_group, role, modula_ai, mcp_connections) need their
 * card's own flow, so only that card draws them. FieldRow.test.js lists the
 * kinds against this map.
 */
const FIELD_ROWS = {
	toggle: ToggleRow,
	options_toggle: OptionsToggleRow,
	text: TextRow,
	number: NumberRow,
	textarea: TextareaRow,
	code_editor: CodeRow,
	select: SelectRow,
	ia_radio: SelectRow,
	range_select: RangeRow,
	image_select: ImageRow,
	post_picker: PostPickerRow,
	paragraph: ParagraphRow,
	combo: ComboRows,
};

/**
 * A field this card cannot draw (an unknown kind, or one only its own card
 * draws): a notice in its place.
 *
 * @param {Object} props
 * @param {Object} props.field Config field.
 */
function UnavailableRow({ field }) {
	const name = decodedText(field.label) || field.name || field.type;
	useDevelopmentError(
		`Modula Settings: no admin-ui row draws the "${field.type}" field "${name}" in this card.`
	);

	return (
		<CardNotice tone="error">
			{sprintf(
				/* translators: %s: setting name. */
				__(
					'“%s” cannot be shown here. Make sure Modula and Modula PRO are up to date.',
					'modula-best-grid-gallery'
				),
				name
			)}
		</CardNotice>
	);
}

/**
 * One config field as its admin-ui row; a kind with no row shows as
 * unavailable.
 *
 * @param {Object}   props
 * @param {Object}   props.field    Config field.
 * @param {Object}   props.values   The card's values.
 * @param {Function} props.setValue Card setter (name, value).
 * @param {string}   props.idPrefix Prefix of the card's control ids.
 */
export function FieldRow({ field, values, setValue, idPrefix }) {
	if (!Object.hasOwn(FIELD_ROWS, field.type)) {
		return <UnavailableRow field={field} />;
	}

	const Row = FIELD_ROWS[field.type];
	// Paragraphs and combos have no name; dotted names nest (`gallery.slug`).
	const idSuffix = (field.name ?? field.type).replace(/\./g, '-');

	return (
		<Row
			field={field}
			value={field.name ? valueAtPath(values, field.name) : undefined}
			onChange={(value) => setValue(field.name, value)}
			id={`${idPrefix}-${idSuffix}`}
			values={values}
			setValue={setValue}
			idPrefix={idPrefix}
		/>
	);
}

/**
 * Config fields as rows, each while its conditions hold.
 *
 * @param {Object}   props
 * @param {Object[]} props.fields   Config fields.
 * @param {Object}   props.values   The card's values.
 * @param {Function} props.setValue Card setter (name, value).
 * @param {string}   props.idPrefix Prefix of the card's control ids.
 */
export function FieldRows({ fields, values, setValue, idPrefix }) {
	return fields
		.filter((field) => conditionsMet(field.conditions, values))
		.map((field, index) => (
			<FieldRow
				key={field.name || `${field.type}-${index}`}
				field={field}
				values={values}
				setValue={setValue}
				idPrefix={idPrefix}
			/>
		));
}
