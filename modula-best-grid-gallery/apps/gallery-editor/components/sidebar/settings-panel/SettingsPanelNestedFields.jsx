/**
 * Redesign settings panel — nested drill fields (same stack rows as hub V2).
 */
import { __ } from '@wordpress/i18n';
import { useGallerySettingsFormBundle } from '../../../form/GallerySettingsFormContext';
import {
	getEnrichedFieldByGroupedPath,
	getGroupKeyFromGroupedPath,
} from '../../../data/formSchema';
import { getNestedStackRows } from '../../../utils/getNestedStackRows';
import SchemaFieldRow from '../../schema/SchemaFieldRow';
import SchemaCompositeRow from '../../schema/SchemaCompositeRow';
import SchemaCollapsibleFieldGroup from '../../schema/SchemaCollapsibleFieldGroup';
import EditorUpsellBlurb from '../../upsell/EditorUpsellBlurb';
import ProofingLockButton, {
	isProofingNestedFrame,
} from '../../proofing/ProofingLockButton';
import { useProofingGalleryCapabilities } from '../../../hooks/useProofingGalleryCapabilities';
import { useModulaSettingsEditorConfig } from '../../../hooks/useModulaSettingsEditorConfig';
import SettingsPanelSection from './SettingsPanelSection';

/**
 * @param {Object} props
 * @param {{ title?: string, groupedPaths?: string[], nestedUpsellGroupedPath?: string }} props.frame
 */
export default function SettingsPanelNestedFields({ frame }) {
	const config = useModulaSettingsEditorConfig();
	const { canUseImageProofing } = useProofingGalleryCapabilities();
	const { form } = useGallerySettingsFormBundle();
	const showProofingLockBtn =
		isProofingNestedFrame(frame) &&
		Boolean(config.takeover) &&
		canUseImageProofing;

	return (
		<form.Subscribe selector={(s) => s.values}>
			{(values) => {
				const { rows } = getNestedStackRows(frame, values);
				const nestedUpsellPath =
					typeof frame?.nestedUpsellGroupedPath === 'string'
						? frame.nestedUpsellGroupedPath.trim()
						: '';
				const nestedUpsellHit = nestedUpsellPath
					? getEnrichedFieldByGroupedPath(nestedUpsellPath)
					: null;

				if (
					rows.length === 0 &&
					!nestedUpsellHit &&
					!showProofingLockBtn
				) {
					return (
						<p className="modula-settings-panel__nested-empty">
							{__(
								'No options to show.',
								'modula-best-grid-gallery'
							)}
						</p>
					);
				}

				if (showProofingLockBtn) {
					return (
						<section
							className="modula-settings-panel__nested"
							aria-label={frame?.title || undefined}
						>
							<SettingsPanelSection
								label={__(
									'Proofing',
									'modula-best-grid-gallery'
								)}
							>
								<ProofingLockButton />
							</SettingsPanelSection>
						</section>
					);
				}

				return (
					<section
						className="modula-settings-panel__nested"
						aria-label={frame?.title || undefined}
					>
						{nestedUpsellHit ? (
							<EditorUpsellBlurb
								field={nestedUpsellHit.field}
								wrapperClassName="modula-settings-panel__nested-upsell"
							/>
						) : null}
						<div className="modula-settings-panel__nested-fields">
							{rows.map((row, ri) => {
								if (row.type === 'hierarchy') {
									return (
										<SchemaCollapsibleFieldGroup
											key={`nested-hi-${row.parentField.groupedPath}`}
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
											key={`nested-row-${ri}`}
											fields={row.fields}
										/>
									);
								}
								return (
									<SchemaFieldRow
										key={row.fields[0].groupedPath}
										groupKey={getGroupKeyFromGroupedPath(
											row.fields[0]
										)}
										field={row.fields[0]}
										disabled={false}
										variant="stacked"
									/>
								);
							})}
						</div>
					</section>
				);
			}}
		</form.Subscribe>
	);
}
