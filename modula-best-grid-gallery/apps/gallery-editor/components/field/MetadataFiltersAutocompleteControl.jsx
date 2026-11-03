/**
 * Gallery-aware filters field: suggestions from gallery settings + sync new tags.
 */

import { useId, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { TokenPicker } from 'admin-ui';
import {
	AdminUiScope,
	filterNameFromSuggestion,
	filterTokenSuggestions,
} from 'editor-shell';
import { useGallerySettingsFormBundle } from '../../form/GallerySettingsFormContext';
import {
	filtersFieldToString,
	galleryFilterSuggestions,
	parseFiltersField,
} from '../bulk-edit/bulkEditUtils';
import { mergeTagsIntoGalleryFilterSettings } from '../bulk-edit/bulkEditSave';

/**
 * @param {string} name
 * @return {string} Label of the result that adds a new filter.
 */
function addFilterLabel(name) {
	return sprintf(
		/* translators: %s: filter name the user typed. */
		__('Add “%s”', 'modula-best-grid-gallery'),
		name
	);
}

/**
 * @param {Object}   props
 * @param {string}   props.id
 * @param {string}   props.label
 * @param {string}   [props.describedBy]
 * @param {string}   props.value
 * @param {Function} props.onChange
 * @param {boolean}  props.disabled
 * @param {string[]} props.filterNames
 * @param {Object}   props.galleryForm
 * @param {string}   [props.className]
 */
function MetadataFiltersTokenFieldSynced({
	id,
	label,
	describedBy,
	value,
	onChange,
	disabled,
	filterNames,
	galleryForm,
	className,
}) {
	const [query, setQuery] = useState('');
	const tokens = parseFiltersField(value);

	function emit(nextTokens) {
		const prev = parseFiltersField(value);
		const newTags = nextTokens.filter((tag) => !prev.includes(tag));
		if (newTags.length) {
			mergeTagsIntoGalleryFilterSettings(galleryForm, newTags);
		}
		onChange(filtersFieldToString(nextTokens));
	}

	return (
		<TokenPicker
			id={id}
			className={className}
			aria-label={label}
			aria-describedby={describedBy}
			tokens={tokens.map((token) => ({ value: token, label: token }))}
			onRemove={(removed) =>
				emit(tokens.filter((token) => token !== removed))
			}
			query={query}
			onQueryChange={setQuery}
			suggestions={filterTokenSuggestions({
				query,
				names: filterNames,
				tokens,
				addLabel: addFilterLabel,
			})}
			onPick={(option) =>
				emit([...tokens, filterNameFromSuggestion(option.value)])
			}
			removeLabel={(name) =>
				sprintf(
					/* translators: %s: filter name. */
					__('Remove filter %s', 'modula-best-grid-gallery'),
					name
				)
			}
			placeholder={__('Filter name', 'modula-best-grid-gallery')}
			disabled={disabled}
		/>
	);
}

/**
 * @param {Object}   props
 * @param {string}   [props.id]        Search field id.
 * @param {string}   [props.label]       Field name, when no visible label points at `id`.
 * @param {string}   [props.describedBy] Ids of help under the field.
 * @param {string}   props.value
 * @param {Function} props.onChange
 * @param {boolean}  props.disabled
 * @param {string}   [props.className] Optional wrapper class for host layout.
 */
export default function MetadataFiltersAutocompleteControl({
	id,
	label,
	...props
}) {
	const { form } = useGallerySettingsFormBundle();
	const generatedId = `modula-metadata-filters-${useId()}`;

	return (
		// The image edit panel renders this outside any settings row.
		<AdminUiScope>
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
						id={id || generatedId}
						label={
							label || __('Filters', 'modula-best-grid-gallery')
						}
						filterNames={snap.filterNames}
						galleryForm={form}
					/>
				)}
			</form.Subscribe>
		</AdminUiScope>
	);
}
