import { __ } from '@wordpress/i18n';
import { ListingClearTrashButton } from './ListingClearTrashButton';
import { ListingSearch } from './ListingSearch';
import { ListingSelectionBulkBar } from './ListingSelectionBulkBar';
import { ListingSortSelect } from './ListingSortSelect';
import { ListingStatusSegments } from './ListingStatusSegments';
import { shouldShowClearTrashForView } from './listingClearTrash';

/**
 * The listing toolbar: search, the status segments, Clear trash on the
 * Trash segment, the listing bulk bar while rows are selected, and Sort.
 *
 * @param {{
 *   view: import('./viewToListingQuery').ListingView,
 *   onChangeView: (view: import('./viewToListingQuery').ListingView) => void,
 *   segmentCounts?: Record<string, number>|null,
 *   statusCounts?: { trash?: number }|null,
 *   selection?: string[],
 *   pageRows?: Object[],
 *   trashListingRows?: (items: Object[]) => Promise<unknown>,
 *   restoreListingRows?: (items: Object[]) => Promise<unknown>,
 *   deleteListingRows?: (items: Object[]) => Promise<unknown>,
 *   canUseApplyPreset?: boolean,
 *   onApplyPreset?: (items: Object[]) => void|Promise<unknown>,
 *   onConvertToNewEditor?: (items: Object[]) => void|Promise<unknown>,
 *   onSelectionCleared?: () => void,
 * }} props
 */
export function ListingToolbar({
	view,
	onChangeView,
	segmentCounts = null,
	statusCounts = null,
	selection = [],
	pageRows = [],
	trashListingRows,
	restoreListingRows,
	deleteListingRows,
	canUseApplyPreset = false,
	onApplyPreset,
	onConvertToNewEditor,
	onSelectionCleared,
}) {
	const showClearTrash =
		shouldShowClearTrashForView(view, statusCounts) &&
		typeof deleteListingRows === 'function';
	const hasSelection = Array.isArray(selection) && selection.length > 0;

	return (
		<div className="modula-content-page__toolbar">
			<ListingSearch
				view={view}
				onChangeView={onChangeView}
				placeholder={__(
					'Search galleries…',
					'modula-best-grid-gallery'
				)}
			/>
			<ListingStatusSegments
				view={view}
				onChangeView={onChangeView}
				segmentCounts={segmentCounts}
			/>
			{showClearTrash ? (
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
					onConvertToNewEditor={onConvertToNewEditor}
					onSelectionCleared={onSelectionCleared}
				/>
			) : null}
			<ListingSortSelect view={view} onChangeView={onChangeView} />
		</div>
	);
}
