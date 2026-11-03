/**
 * Kinds that draw a whole settings row instead of a control: headings,
 * callouts, previews and the host slots Pro fills (gallery defaults,
 * Instagram account). `SchemaFieldRow` renders them from this table; every
 * other kind is a control in `field/fieldControlKinds.js`.
 */
import { useGallerySettingsFormBundle } from '../../form/GallerySettingsFormContext';
import { isEditorDisabledWhen } from '../../logic/fieldVisibility';
import EditorUpsellBlurb from '../upsell/EditorUpsellBlurb';
import SpeedupHelpBlurb from '../upsell/SpeedupHelpBlurb';
import ExifResultPreview from '../field/ExifResultPreview';
import DeeplinkUrlPreview from '../field/DeeplinkUrlPreview';
import GalleryDefaultsShellField from '../field/GalleryDefaultsShellField';
import InstagramAccountSlot from '../field/InstagramAccountSlot';
import FieldHelpInfoTip from './FieldHelpInfoTip';

const ROW_CLASS = 'modula-settings-editor__field-row';

/**
 * @typedef {Object} SchemaRowContext
 * @property {Object}  field
 * @property {string}  fieldName         Dotted form name (group.key).
 * @property {string}  label
 * @property {boolean} rowLocked         Whole-group Lite read-only.
 * @property {boolean} omitControlInLite The setting is replaced by its upsell in Lite.
 */

/**
 * Dims the row while its `editorDisabledWhen` rule holds.
 *
 * @param {Object}                    props
 * @param {Object}                    props.field
 * @param {string}                    props.className
 * @param {import('react').ReactNode} props.children
 */
function RowWithDisabledWhen({ field, className, children }) {
	const { form } = useGallerySettingsFormBundle();
	const schema = field.schema;
	const hasRule =
		schema?.editorDisabledWhen &&
		typeof schema.editorDisabledWhen === 'object';
	if (!hasRule) {
		return <div className={className}>{children}</div>;
	}

	return (
		<form.Subscribe selector={(s) => s.values}>
			{(values) => (
				<div
					className={`${className}${
						isEditorDisabledWhen(schema, values)
							? ` ${ROW_CLASS}--disabled-when`
							: ''
					}`}
				>
					{children}
				</div>
			)}
		</form.Subscribe>
	);
}

/**
 * Binds the row to its form field, as every schema row is, without a control.
 *
 * @param {Object}                    props
 * @param {string}                    props.fieldName
 * @param {import('react').ReactNode} props.children
 */
function BoundRow({ fieldName, children }) {
	const { form } = useGallerySettingsFormBundle();

	return <form.Field name={fieldName}>{() => children}</form.Field>;
}

/**
 * @param {boolean} rowLocked
 * @return {string} Locked modifier, or ''.
 */
function lockedClass(rowLocked) {
	return rowLocked ? ` ${ROW_CLASS}--locked` : '';
}

/**
 * @param {SchemaRowContext} ctx
 */
function HeadingRow({ field, fieldName, label, rowLocked }) {
	const compact = field.editorUi?.compactHeading
		? ` ${ROW_CLASS}--compact-heading`
		: '';

	return (
		<RowWithDisabledWhen
			field={field}
			className={`${ROW_CLASS} ${ROW_CLASS}--section-heading${compact}${lockedClass(rowLocked)}`}
		>
			<BoundRow fieldName={fieldName}>
				<div className="modula-settings-editor__section-heading-inner">
					<span className="modula-settings-editor__section-heading-label">
						{label}
					</span>
					<FieldHelpInfoTip field={field} path={field.groupedPath} />
				</div>
			</BoundRow>
		</RowWithDisabledWhen>
	);
}

/**
 * @param {SchemaRowContext} ctx
 */
function InfoCalloutRow({ field, fieldName, label, rowLocked }) {
	const text =
		typeof field.editorDescription === 'string' &&
		field.editorDescription.trim() !== ''
			? field.editorDescription.trim()
			: label;

	return (
		<RowWithDisabledWhen
			field={field}
			className={`${ROW_CLASS} ${ROW_CLASS}--info-callout${lockedClass(rowLocked)}`}
		>
			<BoundRow fieldName={fieldName}>
				<p className="modula-settings-editor__info-callout">
					<span
						className="modula-settings-editor__info-callout-icon"
						aria-hidden="true"
					>
						i
					</span>
					<span className="modula-settings-editor__info-callout-text">
						{text}
					</span>
				</p>
			</BoundRow>
		</RowWithDisabledWhen>
	);
}

function SpeedupHelpRow() {
	return (
		<div className={`${ROW_CLASS} ${ROW_CLASS}--help-only`}>
			<SpeedupHelpBlurb />
		</div>
	);
}

/**
 * @param {SchemaRowContext} ctx
 */
function ExifResultPreviewRow({ field, fieldName }) {
	return (
		<RowWithDisabledWhen
			field={field}
			className={`${ROW_CLASS} ${ROW_CLASS}--exif-result`}
		>
			<BoundRow fieldName={fieldName}>
				<ExifResultPreview />
			</BoundRow>
		</RowWithDisabledWhen>
	);
}

/**
 * @param {SchemaRowContext} ctx
 */
function DeeplinkUrlPreviewRow({ field, fieldName }) {
	return (
		<RowWithDisabledWhen
			field={field}
			className={`${ROW_CLASS} ${ROW_CLASS}--deeplink-url`}
		>
			<BoundRow fieldName={fieldName}>
				<DeeplinkUrlPreview />
			</BoundRow>
		</RowWithDisabledWhen>
	);
}

/**
 * @param {SchemaRowContext} ctx
 */
function GalleryDefaultsShellRow({ field, fieldName, omitControlInLite }) {
	return (
		<div className={`${ROW_CLASS} ${ROW_CLASS}--gallery-defaults-shell`}>
			<BoundRow fieldName={fieldName}>
				{omitControlInLite ? (
					<EditorUpsellBlurb field={field} />
				) : (
					<GalleryDefaultsShellField />
				)}
			</BoundRow>
		</div>
	);
}

/**
 * @param {SchemaRowContext} ctx
 */
function InstagramAccountRow({ fieldName }) {
	return (
		<div className={`${ROW_CLASS} ${ROW_CLASS}--instagram-account`}>
			<BoundRow fieldName={fieldName}>
				<InstagramAccountSlot />
			</BoundRow>
		</div>
	);
}

const SCHEMA_ROW_RENDERERS = {
	heading: HeadingRow,
	infoCallout: InfoCalloutRow,
	speedupHelp: SpeedupHelpRow,
	exifResultPreview: ExifResultPreviewRow,
	deeplinkUrlPreview: DeeplinkUrlPreviewRow,
	galleryDefaultsShell: GalleryDefaultsShellRow,
	instagramAccount: InstagramAccountRow,
};

/**
 * @param {string|undefined} kind
 * @return {import('react').ComponentType<SchemaRowContext>|null} The row component, or null for a control kind.
 */
export function getSchemaRowRenderer(kind) {
	return typeof kind === 'string' &&
		Object.prototype.hasOwnProperty.call(SCHEMA_ROW_RENDERERS, kind)
		? SCHEMA_ROW_RENDERERS[kind]
		: null;
}
