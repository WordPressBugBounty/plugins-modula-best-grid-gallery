import { DataViews } from '@wordpress/dataviews/wp';
import { ListingClearTrashButton } from './ListingClearTrashButton';
import { ListingSearch } from './ListingSearch';
import { ListingSelectionBulkBar } from './ListingSelectionBulkBar';
import { ListingSortFilter } from './ListingSortFilter';
import { ListingStatusFilter } from './ListingStatusFilter';
import { shouldShowClearTrashForView } from './listingClearTrash';
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
 *   selection?: string[],
 *   pageRows?: Object[],
 *   trashListingRows?: (items: Object[]) => Promise<unknown>,
 *   restoreListingRows?: (items: Object[]) => Promise<unknown>,
 *   deleteListingRows?: (items: Object[]) => Promise<unknown>,
 *   canUseApplyPreset?: boolean,
 *   onApplyPreset?: (items: Object[]) => void|Promise<unknown>,
 *   onSelectionCleared?: () => void,
 * }} props
 */
export function ListingToolbar({
	view,
	onChangeView,
	statusCounts = null,
	hasAlbums = false,
	isPro = false,
	selection = [],
	pageRows = [],
	trashListingRows,
	restoreListingRows,
	deleteListingRows,
	canUseApplyPreset = false,
	onApplyPreset,
	onSelectionCleared,
}) {
	const searchLabel = __('Search galleries…', 'modula-best-grid-gallery');
	const showClearTrash = shouldShowClearTrashForView(view, statusCounts);
	const hasSelection = Array.isArray(selection) && selection.length > 0;

	return (
		<div className="modula-gallery-listing__toolbar">
			<div className="modula-gallery-listing__toolbar-row">
				<ListingSearch
					view={view}
					onChangeView={onChangeView}
					placeholder={searchLabel}
				/>
				{showClearTrash && typeof deleteListingRows === 'function' ? (
					<ListingClearTrashButton
						deleteListingRows={deleteListingRows}
					/>
				) : null}
				{hasSelection ? (
					<ListingSelectionBulkBar
						selection={selection}
						pageRows={pageRows}
						canUseApplyPreset={canUseApplyPreset}
						trashListingRows={trashListingRows}
						restoreListingRows={restoreListingRows}
						deleteListingRows={deleteListingRows}
						onApplyPreset={onApplyPreset}
						onSelectionCleared={onSelectionCleared}
					/>
				) : null}
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
