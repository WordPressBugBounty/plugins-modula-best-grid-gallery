/**
 * One settings group: schema-driven fields via TanStack Form.
 * Renders nothing when every field is hidden (gallery type / rules).
 */

import { __ } from '@wordpress/i18n';
import { GROUP_LABELS } from '../../constants/editorStructure';
import {
	getDisplayBucketsForFields,
	getEnrichedFieldsForGroup,
} from '../../data/formSchema';
import { isFieldVisible } from '../../logic/fieldVisibility';
import { useGallerySettingsFormBundle } from '../../form/GallerySettingsFormContext';
import { useModulaSettingsEditorConfig } from '../../hooks/useModulaSettingsEditorConfig';
import SchemaFieldRow from './SchemaFieldRow';
import SchemaCompositeRow from './SchemaCompositeRow';
import SchemaCollapsibleFieldGroup from './SchemaCollapsibleFieldGroup';

export default function SettingsGroupCard({ groupKey }) {
	const { form } = useGallerySettingsFormBundle();
	const schemaFields = getEnrichedFieldsForGroup(groupKey);
	const config = useModulaSettingsEditorConfig();
	const formUi = config.formUi || {};
	const groupLabels = formUi.groupLabels || {};
	const title = groupLabels[groupKey] || GROUP_LABELS[groupKey] || groupKey;

	if (!schemaFields || schemaFields.length === 0) {
		return (
			<section
				className="modula-settings-editor__section"
				aria-labelledby={`modula-se-${groupKey}`}
			>
				<div className="modula-settings-editor__section-body">
					<p className="modula-settings-editor__placeholder">
						{__(
							'No form schema entries for this group.',
							'modula-best-grid-gallery'
						)}
					</p>
				</div>
			</section>
		);
	}

	return (
		<form.Subscribe
			selector={(s) => ({
				...(s.values || {}),
			})}
		>
			{(values) => {
				const visible = schemaFields.filter(
					(f) => isFieldVisible(f, values) && !f.sidebarNestedOnly
				);
				if (visible.length === 0) {
					return null;
				}
				const rows = getDisplayBucketsForFields(visible);
				return (
					<section
						className="modula-settings-editor__section"
						aria-labelledby={`modula-se-${groupKey}`}
					>
						<header className="modula-settings-editor__section-head">
							<div className="modula-settings-editor__section-titles">
								<h3
									id={`modula-se-${groupKey}`}
									className="modula-settings-editor__section-title"
								>
									{title}
								</h3>
							</div>
						</header>
						<div className="modula-settings-editor__section-body">
							<div className="modula-settings-editor__fields">
								{rows.map((row, ri) => {
									if (row.type === 'hierarchy') {
										return (
											<SchemaCollapsibleFieldGroup
												key={`${groupKey}-hi-${row.parentField.groupedPath}`}
												parentField={row.parentField}
												childRowBuckets={
													row.childRowBuckets
												}
											/>
										);
									}
									if (row.type === 'composite') {
										return (
											<SchemaCompositeRow
												key={`${groupKey}-row-${ri}`}
												fields={row.fields}
											/>
										);
									}
									return (
										<SchemaFieldRow
											key={row.fields[0].groupedPath}
											groupKey={groupKey}
											field={row.fields[0]}
										/>
									);
								})}
							</div>
						</div>
					</section>
				);
			}}
		</form.Subscribe>
	);
}
