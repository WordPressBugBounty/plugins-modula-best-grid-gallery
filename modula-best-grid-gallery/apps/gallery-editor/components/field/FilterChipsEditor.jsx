/**
 * An image's filters as chips, then "+ Add" (canvas, image edit panel and
 * Bulk edit): editor-shell's filter chips over the gallery's filter list.
 * The caller saves the value; new names reach the gallery's filter list
 * through that save.
 */
import {
	FilterChipsEditor as FilterChips,
	filterListNames,
} from 'editor-shell';
import { useGallerySettingsFormBundle } from '../../form/GallerySettingsFormContext';

/**
 * @param {Object}                    props
 * @param {string}                    props.value          Comma-separated filter names.
 * @param {(v: string) => void}       props.onChange       Receives comma-separated names.
 * @param {string}                    props.searchId       Id of the search input.
 * @param {boolean}                   props.isAdding       The search shows instead of "+ Add".
 * @param {(adding: boolean) => void} props.onAddingChange
 */
export default function FilterChipsEditor({
	value,
	onChange,
	searchId,
	isAdding,
	onAddingChange,
}) {
	const { form: galleryForm } = useGallerySettingsFormBundle();

	return (
		<galleryForm.Subscribe selector={(s) => s.values.filters?.filters}>
			{(galleryFilters) => (
				<FilterChips
					value={value}
					onChange={onChange}
					filterNames={filterListNames(galleryFilters)}
					searchId={searchId}
					isAdding={isAdding}
					onAddingChange={onAddingChange}
				/>
			)}
		</galleryForm.Subscribe>
	);
}
