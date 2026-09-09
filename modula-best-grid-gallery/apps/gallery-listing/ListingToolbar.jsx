import { DataViews } from '@wordpress/dataviews/wp';
import { ListingSearch } from './ListingSearch';
import { ListingSortFilter } from './ListingSortFilter';
import { ListingStatusFilter } from './ListingStatusFilter';
import { __ } from '@wordpress/i18n';

/**
 * Hybrid listing toolbar: custom search/status/sort + DataViews view config.
 *
 * @param {{
 *   view: import('./viewToListingQuery').ListingView,
 *   onChangeView: (view: import('./viewToListingQuery').ListingView) => void,
 *   statusCounts?: import('./ListingStatusFilter').ListingStatusCounts|null,
 *   hasAlbums?: boolean,
 *   isPro?: boolean,
 * }} props
 */
export function ListingToolbar({
	view,
	onChangeView,
	statusCounts = null,
	hasAlbums = false,
	isPro = false,
}) {
	const searchLabel = __('Search galleries…', 'modula-best-grid-gallery');

	return (
		<div className="modula-gallery-listing__toolbar">
			<div className="modula-gallery-listing__toolbar-row">
				<ListingSearch
					view={view}
					onChangeView={onChangeView}
					placeholder={searchLabel}
				/>
				<div className="modula-gallery-listing__toolbar-actions">
					<ListingStatusFilter
						view={view}
						onChangeView={onChangeView}
						statusCounts={statusCounts}
						hasAlbums={hasAlbums}
						isPro={isPro}
					/>
					<ListingSortFilter
						view={view}
						onChangeView={onChangeView}
					/>
					<div className="modula-gallery-listing__view-settings">
						<DataViews.ViewConfig />
					</div>
				</div>
			</div>
		</div>
	);
}
