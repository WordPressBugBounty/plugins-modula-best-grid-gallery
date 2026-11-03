/**
 * How the settings panel lays out a field's row, per control kind, as the
 * canvas draws it (`HE_ROW` / `HE_ROWCOL` in the design file):
 *
 * - `row`: label left, control right, on one 52px line (toggle, select,
 *   colour, short text, unit box, media button);
 * - `slider`: label and the control's small parts on one line, its wide part
 *   under them: device switch and value box over the slider (range and
 *   per-device values), scope chip over the code editor (custom CSS);
 * - `column`: label above a control that needs the panel's width
 *   (segmented, text areas, lists, pickers).
 *
 * Hub rows, section rows and per-device rows all read this one table, in the
 * gallery editor and the Albums editor, so every category of both changes
 * together. A kind only one editor has still names its layout here. An
 * editor that draws a kind with another kind's control looks up the kind it
 * draws (the Albums editor's plain text password and ZIP name are `text`).
 *
 * @typedef {'row'|'slider'|'column'} FieldRowLayout
 */

/** @type {Record<string, FieldRowLayout>} */
export const FIELD_ROW_LAYOUTS = {
	toggle: 'row',
	toggleWithNested: 'row',
	text: 'row',
	cssLength: 'row',
	metadataFiltersAutocomplete: 'column',
	number: 'row',
	actionButton: 'column',
	range: 'slider',
	proofingSelectionRange: 'slider',
	select: 'row',
	licenseImageSelect: 'column',
	segmentedEnum: 'column',
	positionGrid: 'row',
	watermarkApplyScope: 'column',
	placeholderPattern: 'column',
	templateLayoutSelect: 'row',
	// The Motion menus: label above a full-width menu (canvas slim picker).
	motionChoice: 'column',
	defaultActiveFilterSelect: 'row',
	textarea: 'column',
	customCssTextarea: 'slider',
	passwordWithStrength: 'column',
	color: 'row',
	parallaxOverlayColor: 'row',
	tuple3: 'slider',
	dimensions: 'column',
	filterNameList: 'column',
	mediaAttachment: 'row',
	mediaUrl: 'column',
	stringList: 'column',
	object: 'column',
};

/**
 * A per-device row (one setting per device, `editorUi.row`) is the canvas's
 * `dev` row whatever its kind: title, device switch and value on one line.
 *
 * @type {FieldRowLayout}
 */
export const DEVICE_ROW_LAYOUT = 'slider';

/**
 * @param {Object|null|undefined} field Form schema field.
 * @return {FieldRowLayout} The row layout; a kind the table does not know is a column.
 */
export function fieldRowLayout(field) {
	const kind = field?.control?.kind;

	return typeof kind === 'string' &&
		Object.prototype.hasOwnProperty.call(FIELD_ROW_LAYOUTS, kind)
		? FIELD_ROW_LAYOUTS[kind]
		: 'column';
}
