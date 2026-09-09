import { Button } from '@wordpress/components';
import { Icon, search } from '@wordpress/icons';
import { __, sprintf } from '@wordpress/i18n';
import { clearListingSearch } from './listingToolbarView';

/**
 * Search-results row shown while a title/ID search is active.
 *
 * @param {{
 *   view: import('./viewToListingQuery').ListingView,
 *   total: number,
 *   onChangeView: (view: import('./viewToListingQuery').ListingView) => void,
 * }} props
 */
export function ListingSearchSummary({ view, total, onChangeView }) {
	const query = typeof view.search === 'string' ? view.search.trim() : '';
	if (!query) {
		return null;
	}

	const countLabel =
		1 === total
			? __('1 result for', 'modula-best-grid-gallery')
			: sprintf(
					/* translators: %s: result count */
					__('%s results for', 'modula-best-grid-gallery'),
					total
				);

	return (
		<div className="modula-gallery-listing__search-summary">
			<div className="modula-gallery-listing__search-summary-main">
				<Icon
					icon={search}
					className="modula-gallery-listing__search-summary-icon"
					size={16}
				/>
				<p className="modula-gallery-listing__search-summary-text">
					{countLabel}{' '}
					<strong className="modula-gallery-listing__search-summary-query">
						&ldquo;{query}&rdquo;
					</strong>
					{__(
						' · gallery titles and IDs.',
						'modula-best-grid-gallery'
					)}
				</p>
			</div>
			<Button
				variant="link"
				className="modula-gallery-listing__search-summary-clear"
				onClick={() => onChangeView(clearListingSearch(view))}
			>
				{__('Clear search', 'modula-best-grid-gallery')}
			</Button>
		</div>
	);
}
