/**
 * A run of field rows: per-device fields share one row (`editorUi.row`),
 * toggle hierarchies collapse, and each single field renders through
 * `renderField` (hub row or stacked schema row). Each row names its settings
 * (`logic/settingAnchor`), where Setting search finds it.
 */
import { Fragment } from '@wordpress/element';
import { isHubHeadingField } from '../../../logic/hubSectionVisibility';
import {
	displayRowFields,
	settingAnchorProps,
} from '../../../logic/settingAnchor';
import SchemaCompositeRow from '../../schema/SchemaCompositeRow';
import SchemaCollapsibleFieldGroup from '../../schema/SchemaCollapsibleFieldGroup';

/**
 * @param {Object}                                       row
 * @param {(field: Object) => import('react').ReactNode} renderField
 * @return {import('react').ReactNode} The row's content.
 */
function renderRow(row, renderField) {
	if (row.type === 'hierarchy') {
		return (
			<SchemaCollapsibleFieldGroup
				parentField={row.parentField}
				childRowBuckets={row.childRowBuckets}
			/>
		);
	}
	if (row.type === 'composite') {
		return <SchemaCompositeRow fields={row.fields} />;
	}
	return renderField(row.fields[0]);
}

/**
 * @param {Object}                                       props
 * @param {object[]}                                     props.rows        Display buckets (`getNestedStackRows`).
 * @param {(field: Object) => import('react').ReactNode} props.renderField One field's row.
 */
export default function SettingsPanelFieldRows({ rows, renderField }) {
	return rows.map((row) => {
		const fields = displayRowFields(row);
		const paths = fields.map((field) => field.groupedPath);
		// Headings are not settings, and their spacing rule needs them to
		// stay siblings of the rows (`:first-child`).
		if (isHubHeadingField(fields[0])) {
			return (
				<Fragment key={paths[0]}>
					{renderRow(row, renderField)}
				</Fragment>
			);
		}
		return (
			<div key={paths[0]} {...settingAnchorProps(paths)}>
				{renderRow(row, renderField)}
			</div>
		);
	});
}
