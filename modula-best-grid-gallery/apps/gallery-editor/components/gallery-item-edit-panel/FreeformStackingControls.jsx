/** Freeform paint order uses the same sidebar actions and settings history as item editing. */
import { __ } from '@wordpress/i18n';
import { ActionRow, Button } from 'shared-ui';
import {
	changeFreeformStacking,
	freeformOccurrenceIds,
	resolveFreeformComposition,
} from 'gallery-shared/preview';
import { useGallerySettingsFormBundle } from '../../form/GallerySettingsFormContext';
import { useModulaSettingsEditorConfig } from '../../hooks/useModulaSettingsEditorConfig';
import { usePreviewReduxStoreItems } from '../../hooks/usePreviewReduxStoreItems';
import { useGalleryPreviewAdminActionsOptional } from '../../hooks/useGalleryPreviewAdminActionsOptional';
import SettingsPanelSection from '../sidebar/settings-panel/SettingsPanelSection';

const ACTIONS = [
	{
		action: 'forward',
		label: __('Bring forward', 'modula-best-grid-gallery'),
	},
	{
		action: 'backward',
		label: __('Send backward', 'modula-best-grid-gallery'),
	},
	{
		action: 'front',
		label: __('Bring to front', 'modula-best-grid-gallery'),
	},
	{ action: 'back', label: __('Send to back', 'modula-best-grid-gallery') },
];

export default function FreeformStackingControls({ storeIndex }) {
	const { form, undoRedo } = useGallerySettingsFormBundle();
	const editor = useModulaSettingsEditorConfig();
	const items = usePreviewReduxStoreItems();
	const adminActions = useGalleryPreviewAdminActionsOptional();
	const editable =
		editor.isPro && adminActions?.previewViewport === 'desktop';
	return (
		<form.Subscribe selector={(state) => state.values}>
			{(values) => {
				if (!editor.isPro || values.general?.type !== 'freeform') {
					return null;
				}
				const ids = freeformOccurrenceIds(items);
				const composition = resolveFreeformComposition(
					ids,
					values.freeform?.placements,
					items
				);
				const id = ids[storeIndex];
				return (
					<SettingsPanelSection
						label={__('Stacking', 'modula-best-grid-gallery')}
					>
						{ACTIONS.map(({ action, label }) => {
							const next = changeFreeformStacking(
								composition,
								id,
								action
							);
							return (
								<ActionRow key={action}>
									<Button
										variant="ghost"
										disabled={
											!editable || next === composition
										}
										onClick={() =>
											undoRedo.commitSettingsStep(
												__(
													'Change stacking',
													'modula-best-grid-gallery'
												),
												() =>
													form.setFieldValue(
														'freeform.placements',
														next
													)
											)
										}
									>
										{label}
									</Button>
								</ActionRow>
							);
						})}
					</SettingsPanelSection>
				);
			}}
		</form.Subscribe>
	);
}
