import { Icon, trash } from '@wordpress/icons';
import { __ } from '@wordpress/i18n';
import {
	isListingTrashFilterActive,
	toggleListingTrashFilter,
} from './listingToolbarView';

/** @typedef {import('./viewToListingQuery').ListingView} ListingView */

/**
 * Listing toolbar Trash filter control — sets SHOW to In the trash (toggle off → Published).
 *
 * @param {{
 *   view: ListingView,
 *   onChangeView: (view: ListingView) => void,
 * }} props
 */
export function ListingTrashFilterButton({ view, onChangeView }) {
	const isActive = isListingTrashFilterActive(view);
	const label = __('In the trash', 'modula-best-grid-gallery');

	return (
		<button
			type="button"
			className={[
				'modula-gallery-listing__trash-filter',
				isActive ? 'is-active' : '',
			]
				.filter(Boolean)
				.join(' ')}
			aria-pressed={isActive}
			aria-label={label}
			title={label}
			onClick={() => onChangeView(toggleListingTrashFilter(view))}
		>
			<Icon icon={trash} size={16} />
		</button>
	);
}
