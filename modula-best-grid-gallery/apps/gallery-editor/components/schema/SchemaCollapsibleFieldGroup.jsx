/**
 * Parent field row + indented, collapsible child fields (when schema exposes collapsibleChildKeys).
 */

import { __, sprintf } from '@wordpress/i18n';
import { useState } from '@wordpress/element';
import { Button } from '@wordpress/components';
import { getGroupKeyFromGroupedPath } from '../../data/formSchema';
import SchemaFieldRow from './SchemaFieldRow';

/**
 * @param {Object}   props
 * @param {Object}   props.parentField     Enriched schema field with collapsibleChildKeys.
 * @param {object[]} props.childRowBuckets Same shape as display row buckets (single-field rows).
 * @param {boolean}  props.disabled
 */
export default function SchemaCollapsibleFieldGroup({
	parentField,
	childRowBuckets,
	disabled,
}) {
	const [open, setOpen] = useState(true);
	const summaryLabel = __('Related options', 'modula-best-grid-gallery');

	return (
		<div className="modula-settings-editor__field-hierarchy">
			<SchemaFieldRow
				groupKey={getGroupKeyFromGroupedPath(parentField)}
				field={parentField}
				disabled={disabled}
			/>
			<div className="modula-settings-editor__field-hierarchy-toolbar">
				<Button
					variant="tertiary"
					className="modula-settings-editor__field-hierarchy-toggle"
					onClick={() => setOpen((v) => !v)}
					aria-expanded={open}
					aria-label={sprintf(
						/* translators: %s: subsection title */
						__(
							'%s — expand or collapse',
							'modula-best-grid-gallery'
						),
						summaryLabel
					)}
				>
					{open
						? __('Hide', 'modula-best-grid-gallery')
						: __('Show', 'modula-best-grid-gallery')}
				</Button>
				<span className="modula-settings-editor__field-hierarchy-summary-text">
					{summaryLabel}
				</span>
			</div>
			{open ? (
				<div
					className="modula-settings-editor__field-hierarchy-children"
					role="group"
					aria-label={summaryLabel}
				>
					{childRowBuckets.map((b) => (
						<SchemaFieldRow
							key={b.fields[0].groupedPath}
							groupKey={getGroupKeyFromGroupedPath(b.fields[0])}
							field={b.fields[0]}
							disabled={disabled}
							hierarchicalIndent
						/>
					))}
				</div>
			) : null}
		</div>
	);
}
