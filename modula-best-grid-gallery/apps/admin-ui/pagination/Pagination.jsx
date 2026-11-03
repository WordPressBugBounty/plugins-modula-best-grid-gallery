import { useId, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import {
	ChevronDownIcon,
	ChevronLeftIcon,
	ChevronRightIcon,
} from '../icons/icons';
import { Menu, MenuItem } from '../menu/Menu';
import { pageCountFor, paginationItems } from './paginationItems';

const DEFAULT_PER_PAGE_OPTIONS = [10, 20, 30, 50, 100];

/**
 * What the footer says about the rows: "1–20 of 33" while there is more than
 * one page, otherwise the count and the noun ("33 galleries", "0 galleries").
 *
 * @param {number}   total
 * @param {number}   page    Current page, already within range.
 * @param {number}   perPage
 * @param {Function} noun    Receives the count, returns the noun for it.
 * @return {string} The range text.
 */
function rangeText(total, page, perPage, noun) {
	if (total <= perPage) {
		return sprintf(
			/* translators: 1: number of items, 2: the item noun for that number, e.g. galleries. */
			__('%1$d %2$s', 'modula-best-grid-gallery'),
			total,
			noun(total)
		);
	}
	const first = (page - 1) * perPage + 1;
	const last = Math.min(page * perPage, total);
	return sprintf(
		/* translators: 1: first row shown, 2: last row shown, 3: number of rows. */
		__('%1$d–%2$d of %3$d', 'modula-best-grid-gallery'),
		first,
		last,
		total
	);
}

/**
 * The content table's footer: range text, "Show N per page" (a menu select)
 * and the page buttons with previous and next. Controlled: the caller owns
 * `page` and `perPage` and gets each change back. A per-page change reports
 * the new size first and then, unless the list is already on it, page 1.
 * A `page` past the last page is shown as the last page.
 *
 * @param {Object}   props
 * @param {number}   props.total            Rows across every page.
 * @param {number}   props.page             Current page, 1-based.
 * @param {number}   props.perPage
 * @param {Function} props.noun             Receives the count, returns its noun ("gallery", "galleries"); use `_n`.
 * @param {Function} props.onPageChange     Receives the page number.
 * @param {Function} props.onPerPageChange  Receives the rows per page.
 * @param {number[]} [props.perPageOptions] Defaults to 10, 20, 30, 50, 100.
 * @param {string}   [props.label]          Names the page navigation.
 */
export function Pagination({
	total,
	page,
	perPage,
	noun,
	onPageChange,
	onPerPageChange,
	perPageOptions = DEFAULT_PER_PAGE_OPTIONS,
	label = __('Pagination', 'modula-best-grid-gallery'),
}) {
	const [perPageOpen, setPerPageOpen] = useState(false);
	const idBase = `modula-admin-pagination-${useId()}`;
	const pageCount = pageCountFor(total, perPage);
	const currentPage = Math.min(Math.max(1, page), pageCount);
	const isFirstPage = 1 === currentPage;
	const isLastPage = pageCount === currentPage;
	/* translators: Before the rows-per-page menu: "Show [20] per page". */
	const showText = __('Show', 'modula-best-grid-gallery');
	/* translators: After the rows-per-page menu: "Show [20] per page". */
	const perPageText = __('per page', 'modula-best-grid-gallery');

	// Out-of-range targets are the disabled arrows; the current page is a no-op.
	const goTo = (target) => {
		if (target < 1 || target > pageCount || target === currentPage) {
			return;
		}
		onPageChange(target);
	};

	const choosePerPage = (size) => {
		if (size === perPage) {
			return;
		}
		onPerPageChange(size);
		if (1 !== currentPage) {
			onPageChange(1);
		}
	};

	return (
		<div className="modula-admin-pagination">
			<div className="modula-admin-pagination__summary">
				<span className="modula-admin-pagination__range">
					{rangeText(total, currentPage, perPage, noun)}
				</span>
				<span className="modula-admin-pagination__per-page">
					<span id={`${idBase}-show`}>{showText}</span>
					<Menu
						open={perPageOpen}
						onOpenChange={setPerPageOpen}
						label={__('Rows per page', 'modula-best-grid-gallery')}
						trigger={(triggerProps) => (
							<button
								{...triggerProps}
								type="button"
								id={`${idBase}-size`}
								className="modula-admin-pagination__size"
								// Reads "Show 20 per page", the words around it.
								aria-labelledby={`${idBase}-show ${idBase}-size ${idBase}-per-page`}
							>
								{perPage}
								<ChevronDownIcon />
							</button>
						)}
					>
						{perPageOptions.map((size) => (
							<MenuItem
								key={size}
								checked={size === perPage}
								onSelect={() => choosePerPage(size)}
							>
								{size}
							</MenuItem>
						))}
					</Menu>
					<span id={`${idBase}-per-page`}>{perPageText}</span>
				</span>
			</div>
			<nav className="modula-admin-pagination__pages" aria-label={label}>
				{/* aria-disabled, not disabled: focus stays on the arrow that reached the end. */}
				<button
					type="button"
					className="modula-admin-pagination__step"
					aria-label={__('Previous page', 'modula-best-grid-gallery')}
					aria-disabled={isFirstPage}
					onClick={() => goTo(currentPage - 1)}
				>
					<ChevronLeftIcon />
				</button>
				{paginationItems(currentPage, pageCount).map((item) =>
					'number' === typeof item ? (
						<button
							key={item}
							type="button"
							className="modula-admin-pagination__page"
							aria-label={sprintf(
								/* translators: %d: page number. */
								__('Page %d', 'modula-best-grid-gallery'),
								item
							)}
							aria-current={
								item === currentPage ? 'page' : undefined
							}
							onClick={() => goTo(item)}
						>
							{item}
						</button>
					) : (
						<span
							key={item}
							className="modula-admin-pagination__ellipsis"
							aria-hidden="true"
						>
							…
						</span>
					)
				)}
				<button
					type="button"
					className="modula-admin-pagination__step"
					aria-label={__('Next page', 'modula-best-grid-gallery')}
					aria-disabled={isLastPage}
					onClick={() => goTo(currentPage + 1)}
				>
					<ChevronRightIcon />
				</button>
			</nav>
		</div>
	);
}
