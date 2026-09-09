/**
 * Modula Gallery - PaginationControls
 * Page mode: prev/next + page numbers. Infinite-scroll: sentinel. Load-more: button.
 *
 * @package
 */

import { useRef, useEffect } from '@wordpress/element';
import { useSelector } from 'react-redux';
import { useGalleryActions } from '../hooks/useGalleryActions';
import {
	buildPaginationLinkItems,
	resolvePaginationNumber,
} from '../utils/paginationFromSettings';

export default function PaginationControls() {
	const pagination = useSelector((state) => state.pagination);
	const config = useSelector((state) => state.gallery.config || {});
	const { goToPage, loadMore } = useGalleryActions();
	const sentinelRef = useRef(null);

	useEffect(() => {
		if (
			pagination.mode !== 'infinite-scroll' ||
			pagination.loading ||
			!pagination.hasMore ||
			!sentinelRef.current
		) {
			return;
		}

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0]?.isIntersecting) {
					loadMore();
				}
			},
			{ rootMargin: '100px', threshold: 0.1 }
		);
		observer.observe(sentinelRef.current);
		return () => observer.disconnect();
	}, [pagination.mode, pagination.loading, pagination.hasMore, loadMore]);

	const positionClass = config.paginationPosition
		? ` modula-pagination--${config.paginationPosition}`
		: '';

	if (pagination.mode === 'infinite-scroll') {
		return (
			<>
				{pagination.loading && (
					<div
						className="modula-pagination-loading"
						aria-hidden="true"
					>
						Loading…
					</div>
				)}
				{pagination.hasMore && (
					<div
						ref={sentinelRef}
						className="modula-infinite-scroll-trigger"
						aria-hidden="true"
					/>
				)}
			</>
		);
	}

	if (pagination.mode === 'load-more') {
		return (
			<nav
				className={`modula-pagination modula-pagination--load-more${positionClass}`}
				aria-label="Gallery pagination"
				role="navigation"
			>
				{pagination.hasMore && (
					<button
						type="button"
						className="modula-pagination__load-more"
						disabled={pagination.loading}
						onClick={() => loadMore()}
					>
						{pagination.loading ? 'Loading…' : 'Load more'}
					</button>
				)}
			</nav>
		);
	}

	const { currentPage, totalPages } = pagination;
	const maxPageLinks = resolvePaginationNumber({
		paginationNumber: config.paginationNumber,
	});
	const linkItems = buildPaginationLinkItems(
		currentPage,
		totalPages,
		maxPageLinks
	);

	return (
		<nav
			className={`modula-pagination${positionClass}`}
			aria-label="Gallery pagination"
			role="navigation"
		>
			<button
				type="button"
				disabled={currentPage <= 1 || pagination.loading}
				onClick={() => goToPage(currentPage - 1)}
				aria-label="Previous page"
			>
				Previous
			</button>
			{linkItems.map((item, index) => {
				if (item.type === 'ellipsis') {
					return (
						<span
							key={`ellipsis-${index}`}
							className="modula-pagination__ellipsis"
							aria-hidden="true"
						>
							…
						</span>
					);
				}
				const p = item.page;
				return (
					<button
						key={`page-${p}`}
						type="button"
						className={p === currentPage ? 'active' : ''}
						disabled={pagination.loading}
						onClick={() => goToPage(p)}
						aria-label={`Page ${p}`}
						aria-current={p === currentPage ? 'page' : undefined}
					>
						{p}
					</button>
				);
			})}
			<button
				type="button"
				disabled={currentPage >= totalPages || pagination.loading}
				onClick={() => goToPage(currentPage + 1)}
				aria-label="Next page"
			>
				Next
			</button>
		</nav>
	);
}
