/**
 * Image edit panel — the image's filters as chips, then "+ Add" (canvas).
 * The item autosave adds new names to the gallery's filter list
 * (`useGalleryItemMetadataAutosave`).
 */
import { useId, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import FilterChipsEditor from '../field/FilterChipsEditor';
import ItemEditField from './ItemEditField';

/**
 * @param {Object}               props
 * @param {string}               props.value    Comma-separated filter names.
 * @param {(v: string) => void}  props.onChange
 */
export default function ImageEditFiltersField({ value, onChange }) {
	const searchId = `modula-item-filters-${useId()}`;
	const [isAdding, setIsAdding] = useState(false);

	// Escape in the search is not handled here: the panel's window listener
	// (`GalleryItemEditSidebarContext`) closes the panel first.
	return (
		<ItemEditField
			label={__('Filters', 'modula-best-grid-gallery')}
			controlId={isAdding ? searchId : undefined}
		>
			<FilterChipsEditor
				value={value}
				onChange={onChange}
				searchId={searchId}
				isAdding={isAdding}
				onAddingChange={setIsAdding}
			/>
		</ItemEditField>
	);
}
