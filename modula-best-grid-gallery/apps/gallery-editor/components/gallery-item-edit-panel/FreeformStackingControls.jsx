/** Freeform paint order uses the same sidebar actions and settings history as item editing. */
import { __ } from '@wordpress/i18n';
import { Button } from 'admin-ui';
import { ItemEditCard } from 'editor-shell';
import {
	changeFreeformStacking,
	freeformOccurrenceIds,
	resolveFreeformComposition,
} from 'gallery-shared/preview';
import { useGallerySettingsFormBundle } from '../../form/GallerySettingsFormContext';
import { useModulaSettingsEditorConfig } from '../../hooks/useModulaSettingsEditorConfig';
import { usePreviewReduxStoreItems } from '../../hooks/usePreviewReduxStoreItems';
import { useGalleryPreviewAdminActionsOptional } from '../../hooks/useGalleryPreviewAdminActionsOptional';
import {
	FREEFORM_STACKING_STEPS,
	commitFreeformStacking,
} from '../../utils/freeformStacking';

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
					<ItemEditCard
						title={__('Stacking', 'modula-best-grid-gallery')}
					>
						<div className="modula-gallery-item-edit-panel__button-grid">
							{FREEFORM_STACKING_STEPS.map(
								({ action, label }) => {
									const next = changeFreeformStacking(
										composition,
										id,
										action
									);
									return (
										<Button
											key={action}
											disabled={
												!editable ||
												next === composition
											}
											onClick={() =>
												commitFreeformStacking(
													form,
													undoRedo,
													next
												)
											}
										>
											{label}
										</Button>
									);
								}
							)}
						</div>
					</ItemEditCard>
				);
			}}
		</form.Subscribe>
	);
}
