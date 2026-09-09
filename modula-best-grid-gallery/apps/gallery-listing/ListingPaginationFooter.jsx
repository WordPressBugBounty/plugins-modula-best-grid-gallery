import { Button } from '@wordpress/components';
import { chevronLeft, chevronRight } from '@wordpress/icons';
import { __, isRTL, sprintf } from '@wordpress/i18n';
import { ListingDropdown, ListingDropdownRadioItem } from './ListingDropdown';

/**
 * @param {{
 *   currentPage: number,
 *   totalPages: number,
 *   onSelectPage: (page: number) => void,
 * }} props
 */
function ListingPaginationPageSelect({
	currentPage,
	totalPages,
	onSelectPage,
}) {
	return (
		<ListingDropdown
			className="modula-listing-dropdown__menu--pagination"
			placement="top-end"
			renderToggle={({ isOpen, onToggle }) => (
				<button
					type="button"
					className={[
						'modula-gallery-listing__pagination-page-trigger',
						isOpen ? 'is-open' : '',
					]
						.filter(Boolean)
						.join(' ')}
					onClick={onToggle}
					aria-expanded={isOpen}
					aria-haspopup="menu"
					aria-label={sprintf(
						/* translators: 1: current page, 2: total pages */
						__('Page %1$d of %2$d', 'modula-best-grid-gallery'),
						currentPage,
						totalPages
					)}
				>
					<span className="modula-gallery-listing__pagination-page-value">
						{currentPage}
					</span>
					<span
						className="modula-gallery-listing__pagination-page-caret"
						aria-hidden
					/>
				</button>
			)}
			renderContent={({ onClose }) =>
				Array.from({ length: totalPages }, (_, index) => {
					const page = index + 1;
					return (
						<ListingDropdownRadioItem
							key={page}
							label={sprintf(
								/* translators: %d: page number */
								__('Page %d', 'modula-best-grid-gallery'),
								page
							)}
							isSelected={currentPage === page}
							onSelect={() => {
								onSelectPage(page);
								onClose();
							}}
						/>
					);
				})
			}
		/>
	);
}

/**
 * Listing footer pagination (replaces default DataViews footer control).
 *
 * @param {{
 *   view: import('./viewToListingQuery').ListingView,
 *   onChangeView: (view: import('./viewToListingQuery').ListingView) => void,
 *   totalItems: number,
 *   totalPages: number,
 * }} props
 */
export function ListingPaginationFooter({
	view,
	onChangeView,
	totalItems,
	totalPages,
}) {
	if (!totalItems || !totalPages || totalPages <= 1) {
		return null;
	}

	const currentPage = view.page ?? 1;
	const prevIcon = isRTL() ? chevronRight : chevronLeft;
	const nextIcon = isRTL() ? chevronLeft : chevronRight;

	const goToPage = (page) => {
		onChangeView({ ...view, page });
	};

	return (
		<div className="modula-gallery-listing__footer dataviews-footer">
			<nav
				className="modula-gallery-listing__pagination"
				aria-label={__('Pagination', 'modula-best-grid-gallery')}
			>
				<div className="modula-gallery-listing__pagination-page">
					<span className="modula-gallery-listing__pagination-label">
						{__('Page', 'modula-best-grid-gallery')}
					</span>
					<ListingPaginationPageSelect
						currentPage={currentPage}
						totalPages={totalPages}
						onSelectPage={goToPage}
					/>
					<span className="modula-gallery-listing__pagination-label">
						{sprintf(
							/* translators: %d: total number of pages */
							__('of %d', 'modula-best-grid-gallery'),
							totalPages
						)}
					</span>
				</div>
				<div className="modula-gallery-listing__pagination-nav">
					<Button
						className="modula-gallery-listing__pagination-nav-button"
						icon={prevIcon}
						label={__('Previous page', 'modula-best-grid-gallery')}
						onClick={() => goToPage(currentPage - 1)}
						disabled={currentPage <= 1}
						accessibleWhenDisabled
						showTooltip
						size="compact"
						tooltipPosition="top"
					/>
					<Button
						className="modula-gallery-listing__pagination-nav-button"
						icon={nextIcon}
						label={__('Next page', 'modula-best-grid-gallery')}
						onClick={() => goToPage(currentPage + 1)}
						disabled={currentPage >= totalPages}
						accessibleWhenDisabled
						showTooltip
						size="compact"
						tooltipPosition="top"
					/>
				</div>
			</nav>
		</div>
	);
}
