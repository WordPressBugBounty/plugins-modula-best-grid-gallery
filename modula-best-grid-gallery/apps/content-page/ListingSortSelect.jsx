import { useId, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Menu, MenuItem } from 'admin-ui';
import { ChevronDownIcon } from 'admin-ui/icons/icons';
import {
	LISTING_SORT_AZ,
	LISTING_SORT_NEWEST,
	LISTING_SORT_OLDEST,
	applyListingSort,
	getListingSortValue,
} from './listingToolbarView';

const SORT_OPTIONS = [
	{
		value: LISTING_SORT_NEWEST,
		label: __('Newest first', 'modula-best-grid-gallery'),
	},
	{
		value: LISTING_SORT_OLDEST,
		label: __('Oldest first', 'modula-best-grid-gallery'),
	},
	{ value: LISTING_SORT_AZ, label: __('A–Z', 'modula-best-grid-gallery') },
];

/**
 * Sort as a menu select: the "Sort" label and a button showing the current
 * order, opening the three orders as radio items.
 *
 * @param {Object}                                     props
 * @param {import('./viewToListingQuery').ListingView} props.view
 * @param {Function}                                   props.onChangeView
 */
export function ListingSortSelect({ view, onChangeView }) {
	const [open, setOpen] = useState(false);
	const labelId = `modula-content-page-sort-${useId()}`;
	const current = getListingSortValue(view);
	const currentLabel = SORT_OPTIONS.find(
		(option) => option.value === current
	).label;

	return (
		<div className="modula-content-page__sort">
			<span id={labelId} className="modula-content-page__sort-label">
				{__('Sort', 'modula-best-grid-gallery')}
			</span>
			<Menu
				open={open}
				onOpenChange={setOpen}
				label={__('Sort', 'modula-best-grid-gallery')}
				align="end"
				trigger={(triggerProps) => (
					<button
						{...triggerProps}
						type="button"
						id={`${labelId}-value`}
						className="modula-content-page__sort-trigger"
						// Reads "Sort, Newest first".
						aria-labelledby={`${labelId} ${labelId}-value`}
					>
						{currentLabel}
						<ChevronDownIcon />
					</button>
				)}
			>
				{SORT_OPTIONS.map((option) => (
					<MenuItem
						key={option.value}
						checked={option.value === current}
						onSelect={() => {
							if (option.value !== current) {
								onChangeView(
									applyListingSort(view, option.value)
								);
							}
						}}
					>
						{option.label}
					</MenuItem>
				))}
			</Menu>
		</div>
	);
}
