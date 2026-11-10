/**
 * The column settings as the settings panel draws them for the gallery type:
 * the layout policy's column minimum on the tablet / mobile sliders, and the
 * type's own help where the schema's would mislead. The desktop columns
 * select applies the policy's desktop minimum to its options (selectKind).
 *
 * @package
 */

import { __ } from '@wordpress/i18n';
import { getLayoutPolicy } from 'gallery-shared/layoutRules';

/** Column settings → the breakpoint of `policy.derived.minColumns` each one follows. */
const COLUMN_FIELD_BREAKPOINTS = new Map([
	['layout.gridType', 'desktop'],
	['responsive.tabletColumns', 'responsive'],
	['responsive.mobileColumns', 'responsive'],
]);

/**
 * Column help for layouts whose tiles span columns.
 *
 * @return {Map<string, string>} Help by gallery type.
 */
function columnHelpByGalleryType() {
	return new Map([
		[
			'bento',
			__(
				'A tile takes one or two columns, so rows can show different numbers of tiles.',
				'modula-best-grid-gallery'
			),
		],
	]);
}

/**
 * @param {Object}                                  field         Enriched schema field.
 * @param {Record<string, Record<string, unknown>>} groupedValues Grouped form values.
 * @return {Object} The field as drawn for the gallery type; the same object when nothing changes.
 */
export function fieldForGalleryLayout(field, groupedValues) {
	const breakpoint = COLUMN_FIELD_BREAKPOINTS.get(field?.groupedPath);
	if (!breakpoint) {
		return field;
	}
	const policy = getLayoutPolicy(groupedValues);
	const help = columnHelpByGalleryType().get(policy.type);
	const minColumns = policy.derived.minColumns[breakpoint];
	const control = field.control || {};
	// The desktop select drops its options below the minimum itself.
	const raisesMin =
		control.kind === 'range' && (control.min ?? 0) < minColumns;
	if (!help && !raisesMin) {
		return field;
	}
	return {
		...field,
		...(help ? { editorDescription: help } : {}),
		...(raisesMin ? { control: { ...control, min: minColumns } } : {}),
	};
}
