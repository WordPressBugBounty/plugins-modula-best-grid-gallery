/**
 * Body of a primary TabPanel tab — intro + stacked full-width sections.
 * When the sidebar stack has frames, shows nested virtual levels (Back + fields).
 */
import { useEffect } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Button } from '@wordpress/components';
import { Icon, chevronLeft } from '@wordpress/icons';
import { SETTINGS_EDITOR_CATEGORIES } from '../../constants/editorStructure';
import { useModulaSettingsEditorConfig } from '../../hooks/useModulaSettingsEditorConfig';
import { useGallerySettingsFormBundle } from '../../form/GallerySettingsFormContext';
import { useTakeoverSidebarStack } from '../../context/TakeoverSidebarStackContext';
import {
	getEnrichedFieldByGroupedPath,
	getGroupKeyFromGroupedPath,
} from '../../data/formSchema';
import { getNestedStackRows } from '../../utils/getNestedStackRows';
import SettingsGroupCard from '../schema/SettingsGroupCard';
import CategoryHubPanel from './CategoryHubPanel';
import {
	categoryHasHubSections,
	getCategoryGroupKeys,
} from '../../logic/editorCategoryHub';
import SchemaFieldRow from '../schema/SchemaFieldRow';
import SchemaCompositeRow from '../schema/SchemaCompositeRow';
import SchemaCollapsibleFieldGroup from '../schema/SchemaCollapsibleFieldGroup';
import EditorUpsellBlurb from '../upsell/EditorUpsellBlurb';
import ProofingLockButton, {
	isProofingNestedFrame,
} from '../proofing/ProofingLockButton';
import { useProofingGalleryCapabilities } from '../../hooks/useProofingGalleryCapabilities';

/**
 * @param {Object} props
 * @param {string} props.categoryName
 */
export default function CategoryPanelContent({ categoryName }) {
	const config = useModulaSettingsEditorConfig();
	const { canUseImageProofing } = useProofingGalleryCapabilities();
	const { form } = useGallerySettingsFormBundle();
	const { stack, stackDepth, popFrame, clearStack } =
		useTakeoverSidebarStack();

	const category = SETTINGS_EDITOR_CATEGORIES.find(
		(c) => c.name === categoryName
	);

	useEffect(() => {
		clearStack();
	}, [categoryName, clearStack]);

	if (!category) {
		return null;
	}

	if (stackDepth > 0) {
		const frame = stack[stack.length - 1];
		const showInlineNestedHead = !config.takeover;
		return (
			<div className="modula-settings-editor__category modula-settings-editor__category--nested-stack">
				{showInlineNestedHead ? (
					<div className="modula-settings-editor__nested-sidebar-head">
						<Button
							type="button"
							variant="tertiary"
							className="modula-settings-editor__nested-sidebar-back"
							onClick={popFrame}
						>
							<Icon
								icon={chevronLeft}
								size={18}
								aria-hidden="true"
							/>
							<span>
								{__('Back', 'modula-best-grid-gallery')}
							</span>
						</Button>
						<h2 className="modula-settings-editor__nested-sidebar-title">
							{frame.title}
						</h2>
					</div>
				) : null}
				<form.Subscribe
					selector={(s) => ({
						...(s.values || {}),
					})}
				>
					{(values) => {
						const { rows } = getNestedStackRows(frame, values);
						const nestedUpsellPath =
							typeof frame.nestedUpsellGroupedPath === 'string'
								? frame.nestedUpsellGroupedPath.trim()
								: '';
						const nestedUpsellHit = nestedUpsellPath
							? getEnrichedFieldByGroupedPath(nestedUpsellPath)
							: null;
						const showProofingLockBtn =
							isProofingNestedFrame(frame) &&
							Boolean(config.takeover) &&
							canUseImageProofing;
						if (
							rows.length === 0 &&
							!nestedUpsellHit &&
							!showProofingLockBtn
						) {
							return (
								<div className="modula-settings-editor__sections">
									<p className="modula-settings-editor__placeholder">
										{__(
											'No options to show.',
											'modula-best-grid-gallery'
										)}
									</p>
								</div>
							);
						}
						return (
							<div className="modula-settings-editor__sections">
								{showProofingLockBtn ? (
									<ProofingLockButton />
								) : (
									<section
										className="modula-settings-editor__section modula-settings-editor__section--nested-panel"
										aria-label={frame.title}
									>
										<div className="modula-settings-editor__section-body">
											{nestedUpsellHit ? (
												<div className="modula-settings-editor__nested-panel-upsell">
													<EditorUpsellBlurb
														field={
															nestedUpsellHit.field
														}
													/>
												</div>
											) : null}
											<div className="modula-settings-editor__fields">
												{rows.map((row, ri) => {
													if (
														row.type === 'hierarchy'
													) {
														return (
															<SchemaCollapsibleFieldGroup
																key={`nested-hi-${row.parentField.groupedPath}`}
																parentField={
																	row.parentField
																}
																childRowBuckets={
																	row.childRowBuckets
																}
															/>
														);
													}
													if (
														row.type === 'composite'
													) {
														return (
															<SchemaCompositeRow
																key={`nested-row-${ri}`}
																fields={
																	row.fields
																}
															/>
														);
													}
													return (
														<SchemaFieldRow
															key={
																row.fields[0]
																	.groupedPath
															}
															groupKey={getGroupKeyFromGroupedPath(
																row.fields[0]
															)}
															field={
																row.fields[0]
															}
															disabled={false}
														/>
													);
												})}
											</div>
										</div>
									</section>
								)}
							</div>
						);
					}}
				</form.Subscribe>
			</div>
		);
	}

	if (categoryHasHubSections(category)) {
		return <CategoryHubPanel category={category} />;
	}

	return (
		<div className="modula-settings-editor__category">
			<p className="modula-settings-editor__category-desc">
				{category.description}
			</p>
			<div className="modula-settings-editor__sections">
				{getCategoryGroupKeys(category).map((groupKey) => (
					<SettingsGroupCard key={groupKey} groupKey={groupKey} />
				))}
			</div>
		</div>
	);
}
