/**
 * Gallery-aware filters field: suggestions from gallery settings + sync new tags.
 */

import { __ } from '@wordpress/i18n';
import { FiltersTokenField } from 'shared-ui';
import { useGallerySettingsFormBundle } from '../../form/GallerySettingsFormContext';
import {
	filtersFieldToString,
	galleryFilterSuggestions,
	parseFiltersField,
} from '../bulk-edit/bulkEditUtils';
import { mergeTagsIntoGalleryFilterSettings } from '../bulk-edit/bulkEditSave';

/**
 * @param {Object}   props
 * @param {string}   props.value
 * @param {Function} props.onChange
 * @param {boolean}  props.disabled
 * @param {string[]} props.filterNames
 * @param {Object}   props.galleryForm
 * @param {string}   [props.className]
 */
function MetadataFiltersTokenFieldSynced({
	value,
	onChange,
	disabled,
	filterNames,
	galleryForm,
	className,
}) {
	const tokens = parseFiltersField(value);

	function handleChange(nextTokens) {
		const prev = parseFiltersField(value);
		const newTags = nextTokens.filter((tag) => !prev.includes(tag));
		if (newTags.length) {
			mergeTagsIntoGalleryFilterSettings(galleryForm, newTags);
		}
		onChange(filtersFieldToString(nextTokens));
	}

	return (
		<FiltersTokenField
			className={className}
			value={tokens}
			suggestions={filterNames}
			onChange={handleChange}
			disabled={disabled}
			placeholder={__('Filter name', 'modula-best-grid-gallery')}
			addLabel={__('+ Add', 'modula-best-grid-gallery')}
		/>
	);
}

/**
 * @param {Object}   props
 * @param {string}   props.value
 * @param {Function} props.onChange
 * @param {boolean}  props.disabled
 * @param {string}   [props.className] Optional wrapper class for host layout.
 */
export default function MetadataFiltersAutocompleteControl(props) {
	const { form } = useGallerySettingsFormBundle();

	return (
		<form.Subscribe
			selector={(s) => {
				const list = s.values.filters?.filters;
				const filterNames = galleryFilterSuggestions(list);
				return {
					filterNames,
					_listSig: Array.isArray(list)
						? list
								.map((x, i) => `${i}\u001f${String(x)}`)
								.join('\u001e')
						: '',
				};
			}}
		>
			{(snap) => (
				<MetadataFiltersTokenFieldSynced
					{...props}
					filterNames={snap.filterNames}
					galleryForm={form}
				/>
			)}
		</form.Subscribe>
	);
}
