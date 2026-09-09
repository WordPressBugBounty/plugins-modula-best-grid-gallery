import { useMemo } from '@wordpress/element';
import { chevronUpDown } from '@wordpress/icons';
import { __ } from '@wordpress/i18n';
import {
	ListingDropdown,
	ListingDropdownRadioItem,
	ListingDropdownToolbarTrigger,
} from './ListingDropdown';
import {
	LISTING_SORT_NEWEST,
	LISTING_SORT_OLDEST,
	applyListingSort,
	getListingSortValue,
} from './listingToolbarView';

/** @typedef {import('./viewToListingQuery').ListingView} ListingView */

/**
 * @param {{
 *   view: ListingView,
 *   onChangeView: (view: ListingView) => void,
 * }} props
 */
export function ListingSortFilter({ view, onChangeView }) {
	const sortValue = getListingSortValue(view);

	const sortOptions = useMemo(
		() => [
			{
				value: LISTING_SORT_NEWEST,
				label: __('Newest first', 'modula-best-grid-gallery'),
			},
			{
				value: LISTING_SORT_OLDEST,
				label: __('Oldest first', 'modula-best-grid-gallery'),
			},
		],
		[]
	);

	const triggerLabel =
		sortValue === LISTING_SORT_OLDEST
			? __('Oldest first', 'modula-best-grid-gallery')
			: __('Newest first', 'modula-best-grid-gallery');

	return (
		<ListingDropdown
			className="modula-listing-dropdown__menu--sort"
			placement="bottom-start"
			renderToggle={({ isOpen, onToggle }) => (
				<ListingDropdownToolbarTrigger
					className="modula-gallery-listing__toolbar-filter modula-gallery-listing__toolbar-filter--sort"
					icon={chevronUpDown}
					label={triggerLabel}
					isOpen={isOpen}
					onToggle={onToggle}
				/>
			)}
			renderContent={({ onClose }) =>
				sortOptions.map((option) => (
					<ListingDropdownRadioItem
						key={option.value}
						label={option.label}
						isSelected={sortValue === option.value}
						onSelect={() => {
							onChangeView(applyListingSort(view, option.value));
							onClose();
						}}
					/>
				))
			}
		/>
	);
}
