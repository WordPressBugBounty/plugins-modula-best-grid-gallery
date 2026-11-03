/**
 * Image edit panel — the image's own hover effect (canvas: a card after
 * Filters, label left, select right). "Gallery default" keeps the gallery's.
 */
import { useId } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { SettingsRow } from 'admin-ui';
import { ItemEditCard } from 'editor-shell';
import ItemHoverPresetSelect from '../hover-effect-builder/ItemHoverPresetSelect';
import { ITEM_HOVER_PRESET_KEY } from '../../utils/galleryItemFields';

/**
 * @param {Object} props
 * @param {Object} props.form Image metadata form.
 */
export default function ImageEditHoverCard({ form }) {
	const controlId = `modula-item-hover-${useId()}`;
	const label = __('Hover effect', 'modula-best-grid-gallery');
	return (
		<ItemEditCard className="modula-gallery-item-edit-panel__hover">
			<form.Field name={ITEM_HOVER_PRESET_KEY}>
				{(field) => (
					<SettingsRow label={label} controlId={controlId}>
						<ItemHoverPresetSelect
							id={controlId}
							label={label}
							value={field.state.value ?? ''}
							onChange={(v) => field.handleChange(v)}
						/>
					</SettingsRow>
				)}
			</form.Field>
		</ItemEditCard>
	);
}
