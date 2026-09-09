/**
 * Modula Gallery - useGalleryActions hook
 * Single entry point for pagination/filtering: uses RTK Query for server-side,
 * sync actions for client-side. No thunks.
 *
 * @package
 */

import { useDispatch, useSelector } from 'react-redux';
import { useLazyGetItemsQuery } from '../store/api/galleryApi';
import {
	clientPaginationTotals,
	filterItems,
	getPageSlice,
	isAppendPaginationMode,
} from '../store/clientLogic';
import {
	setItems,
	setFilteredItems,
	clearFilteredItems,
	addItems,
} from '../store/slices/itemsSlice';
import { setPage, setPaginationTotals } from '../store/slices/paginationSlice';
import { setActiveFilters } from '../store/slices/filteringSlice';
import { clearLightboxCatalogCache } from '../lightbox/resolveLightboxItems';

/**
 * Hook that returns goToPage, loadMore, applyFilter, removeFilter, clearFilters.
 * Server-side: dispatches RTK Query getItems; client-side: dispatches sync actions.
 */
export function useGalleryActions() {
	const dispatch = useDispatch();
	const [triggerGetItems] = useLazyGetItemsQuery();
	const fetchFunction = useSelector((s) => s.gallery.fetchFunction);
	const galleryId = useSelector((s) => s.gallery.galleryId);
	const items = useSelector((s) => s.items);
	const pagination = useSelector((s) => s.pagination);
	const filtering = useSelector((s) => s.filtering);

	function paginatedSourceList() {
		return items.filteredItems !== null
			? items.filteredItems
			: items.originalItems;
	}

	/**
	 * Client-side first page for numbered or append pagination modes.
	 *
	 * @param {Array} list
	 * @return {Array}
	 */
	function clientFirstPageItems(list) {
		if (
			!pagination.enabled ||
			pagination.type !== 'client' ||
			!list.length
		) {
			return list;
		}
		if (
			pagination.mode === 'page' ||
			isAppendPaginationMode(pagination.mode)
		) {
			return getPageSlice(list, 1, pagination.perPage);
		}
		return list;
	}

	/**
	 * When visitor pagination is off, show the full list; otherwise slice for page mode.
	 *
	 * @param {Array}  list Full item list (original or filtered).
	 * @param {number} page 1-based page.
	 * @return {Array}
	 */
	function itemsForCurrentPage(list, page) {
		if (
			!pagination.enabled ||
			pagination.type !== 'client' ||
			pagination.mode !== 'page'
		) {
			return list;
		}
		return getPageSlice(list, page, pagination.perPage);
	}

	function syncClientPaginationTotals(list) {
		const { totalItems, totalPages } = clientPaginationTotals(
			list.length,
			pagination.perPage
		);
		const hasMore = isAppendPaginationMode(pagination.mode)
			? totalPages > 1
			: undefined;
		dispatch(
			setPaginationTotals({
				totalItems,
				totalPages,
				...(hasMore !== undefined ? { hasMore } : {}),
			})
		);
	}

	function goToPage(page) {
		if (!pagination.enabled || isAppendPaginationMode(pagination.mode)) {
			return;
		}
		if (page < 1 || page > pagination.totalPages) {
			return;
		}

		dispatch(setPage(page));

		if (pagination.type === 'client') {
			dispatch(
				setItems(itemsForCurrentPage(paginatedSourceList(), page))
			);
			return;
		}

		triggerGetItems({
			type: 'pagination',
			mode: 'page',
			page,
			perPage: pagination.perPage,
			filters: filtering.activeFilters,
		});
	}

	function loadMore() {
		if (
			!isAppendPaginationMode(pagination.mode) ||
			pagination.loading ||
			!pagination.hasMore
		) {
			return;
		}

		const nextPage = pagination.currentPage + 1;

		if (pagination.type === 'client') {
			const list = paginatedSourceList();
			const { totalPages } = clientPaginationTotals(
				list.length,
				pagination.perPage
			);
			if (nextPage > totalPages) {
				dispatch(setPaginationTotals({ hasMore: false }));
				return;
			}
			dispatch(
				addItems(getPageSlice(list, nextPage, pagination.perPage))
			);
			dispatch(setPage(nextPage));
			dispatch(setPaginationTotals({ hasMore: nextPage < totalPages }));
			return;
		}

		if (typeof fetchFunction !== 'function') {
			return;
		}

		triggerGetItems({
			type: 'pagination',
			mode: pagination.mode,
			page: nextPage,
			perPage: pagination.perPage,
			filters: filtering.activeFilters,
		});
	}

	function applyFilter(filterKey, filterValue) {
		if (!filtering.enabled) {
			return;
		}

		const existing = filtering.activeFilters.findIndex(
			(f) => f.key === filterKey
		);
		const newFilters = [...filtering.activeFilters];
		if (existing >= 0) {
			newFilters[existing] = { key: filterKey, value: filterValue };
		} else {
			newFilters.push({ key: filterKey, value: filterValue });
		}
		dispatch(setActiveFilters(newFilters));
		clearLightboxCatalogCache(galleryId);

		if (filtering.type === 'client') {
			let filtered = items.originalItems;
			newFilters.forEach((f) => {
				filtered = filterItems(filtered, f.key, f.value);
			});
			dispatch(setFilteredItems(filtered));
			dispatch(setPage(1));
			dispatch(setItems(clientFirstPageItems(filtered)));
			syncClientPaginationTotals(filtered);
			return;
		}

		triggerGetItems({
			type: 'filter',
			page: 1,
			perPage: pagination.perPage,
			filters: newFilters,
		});
	}

	function removeFilter(filterKey) {
		if (!filtering.enabled) {
			return;
		}

		const newFilters = filtering.activeFilters.filter(
			(f) => f.key !== filterKey
		);
		dispatch(setActiveFilters(newFilters));
		clearLightboxCatalogCache(galleryId);

		if (filtering.type === 'client') {
			dispatch(clearFilteredItems());
			if (newFilters.length === 0) {
				dispatch(setPage(1));
				dispatch(setItems(clientFirstPageItems(items.originalItems)));
				syncClientPaginationTotals(items.originalItems);
			} else {
				let filtered = items.originalItems;
				newFilters.forEach((f) => {
					filtered = filterItems(filtered, f.key, f.value);
				});
				dispatch(setFilteredItems(filtered));
				dispatch(setPage(1));
				dispatch(setItems(clientFirstPageItems(filtered)));
				syncClientPaginationTotals(filtered);
			}
			return;
		}

		triggerGetItems({
			type: 'filter',
			page: 1,
			perPage: pagination.perPage,
			filters: newFilters,
		});
	}

	function clearFilters() {
		if (!filtering.enabled) {
			return;
		}

		dispatch(setActiveFilters([]));
		dispatch(clearFilteredItems());
		clearLightboxCatalogCache(galleryId);

		if (filtering.type === 'client') {
			dispatch(setPage(1));
			dispatch(setItems(clientFirstPageItems(items.originalItems)));
			syncClientPaginationTotals(items.originalItems);
			return;
		}

		triggerGetItems({
			type: 'filter',
			page: 1,
			perPage: pagination.perPage,
			filters: [],
		});
	}

	return {
		goToPage,
		loadMore,
		applyFilter,
		removeFilter,
		clearFilters,
	};
}
