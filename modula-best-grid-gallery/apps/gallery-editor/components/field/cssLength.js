/**
 * A CSS length stored as one string ("100%", "1200px"), edited as a number
 * and a unit (Gallery width). A bare number is pixels, as the front end
 * reads it. Anything else ("auto", "calc(…)") is not a length this box can
 * show; its caller keeps the plain text field.
 */

/** Units the box reads. */
export const CSS_LENGTH_UNITS = ['px', '%', 'em', 'rem', 'vw', 'vh'];

/**
 * Units the px / % toggle offers, in its order. A width stored in another
 * unit keeps it as fixed text, so nothing is converted.
 */
export const CSS_LENGTH_TOGGLE_UNITS = ['px', '%'];

const DEFAULT_UNIT = 'px';

// No minus sign: a width is never negative, and the box cannot type one.
const CSS_LENGTH_PATTERN = new RegExp(
	`^(\\d+\\.?\\d*|\\.\\d+)\\s*(${CSS_LENGTH_UNITS.join('|')})?$`,
	'i'
);

// Empty, or digits with at most one decimal point ("12.", ".5"); not "." alone.
const NUMBER_DRAFT_PATTERN = /^(?:\d+\.?\d*|\.\d+)?$/;

/**
 * @typedef {Object} CssLengthParts
 * @property {string} number As stored, without the unit; empty when unset.
 * @property {string} unit   One of `CSS_LENGTH_UNITS`.
 */

/**
 * @param {unknown} value Stored length.
 * @return {CssLengthParts|null} Its parts, or null when it is not a number with a known unit.
 */
export function parseCssLength(value) {
	const text =
		value === null || value === undefined ? '' : String(value).trim();
	if (text === '') {
		return { number: '', unit: DEFAULT_UNIT };
	}

	const match = text.match(CSS_LENGTH_PATTERN);
	if (!match) {
		return null;
	}

	return {
		number: match[1],
		unit: match[2] ? match[2].toLowerCase() : DEFAULT_UNIT,
	};
}

/**
 * @param {string} number As typed.
 * @param {string} unit
 * @return {string} The stored length; an empty number stores an empty string.
 */
export function formatCssLength(number, unit) {
	const trimmed = String(number).trim();

	return trimmed === '' ? '' : `${trimmed}${unit}`;
}

/**
 * The unit the box shows and stores with the next typed number. An empty
 * width stores no unit, so it keeps the one last shown: clearing "100%" and
 * typing again stays in "%".
 *
 * @param {CssLengthParts} parts         The stored length's parts.
 * @param {string}         lastShownUnit The unit shown before the width was emptied.
 * @return {string} The unit.
 */
export function cssLengthDisplayUnit(parts, lastShownUnit) {
	return parts.number === '' ? lastShownUnit : parts.unit;
}

/**
 * @param {string} unit The unit the box shows.
 * @return {boolean} True when the px / % toggle can show it.
 */
export function isCssLengthToggleUnit(unit) {
	return CSS_LENGTH_TOGGLE_UNITS.includes(unit);
}

/**
 * The stored length after the toggle picks another unit: the same number,
 * no conversion ("100%" → "100px"). The form's write still applies the
 * layout's width clamp, so a percentage above 100 is saved as "100%".
 *
 * @param {CssLengthParts} parts The stored length's parts.
 * @param {string}         unit  The picked unit.
 * @return {string} The stored length; an empty width stays empty.
 */
export function switchCssLengthUnit(parts, unit) {
	return formatCssLength(parts.number, unit);
}

/**
 * Whether the box accepts typed text: a number, possibly in progress ("12."),
 * that `parseCssLength` reads back once the unit is added.
 *
 * @param {string} draft
 * @return {boolean} True when the text can be stored.
 */
export function isCssLengthNumberDraft(draft) {
	return NUMBER_DRAFT_PATTERN.test(draft);
}
