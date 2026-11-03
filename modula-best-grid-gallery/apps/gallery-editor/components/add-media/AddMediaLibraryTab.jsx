/**
 * Media library tab: search and date filters, a grid of images to
 * multi-select, and "Add N images". Images already in the gallery show but
 * cannot be picked.
 */
import { useState } from '@wordpress/element';
import { __, _n, sprintf } from '@wordpress/i18n';
import { Select } from 'admin-ui';
import {
	MediaPickerFooter,
	MediaPickerGrid,
	MediaPickerSearch,
	MediaPickerToolbar,
	useDebouncedValue,
} from 'editor-shell';
import { useMediaLibraryQuery } from '../../query/useMediaLibraryQuery';
import { getTakeoverPreviewLibraryAttachmentIds } from '../../utils/getTakeoverPreviewLibraryAttachmentIds';
import { readMediaMonthOptions, toMediaLibraryItem } from './mediaLibraryQuery';

const SEARCH_DELAY_MS = 300;

/**
 * @param {Object}                  props
 * @param {boolean}                 props.busy  An add is running.
 * @param {(ids: number[]) => void} props.onAdd
 */
export default function AddMediaLibraryTab({ busy, onAdd }) {
	const [search, setSearch] = useState('');
	const [month, setMonth] = useState('');
	const [selectedIds, setSelectedIds] = useState(() => new Set());
	// Read once per open: the gallery does not change while the dialog is up.
	const [inGalleryIds] = useState(
		() => new Set(getTakeoverPreviewLibraryAttachmentIds())
	);
	const [monthOptions] = useState(() =>
		readMediaMonthOptions(window.wp?.media?.view?.settings)
	);
	const debouncedSearch = useDebouncedValue(search, SEARCH_DELAY_MS);

	const library = useMediaLibraryQuery({
		search: debouncedSearch,
		month,
	});

	const pages = library.data?.pages ?? [];
	const items = pages
		.flatMap((page) => page.rows)
		.map((row) => toMediaLibraryItem(row, inGalleryIds))
		.filter(Boolean)
		.map((item) => ({
			...item,
			disabled: item.inGallery,
			note: item.inGallery
				? __('· In gallery', 'modula-best-grid-gallery')
				: '',
		}));
	const total = pages[0]?.total ?? 0;
	const isFiltered = debouncedSearch.trim() !== '' || month !== '';

	const toggle = (id) => {
		setSelectedIds((current) => {
			const next = new Set(current);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	};

	return (
		<>
			<MediaPickerToolbar
				count={
					library.isSuccess
						? sprintf(
								/* translators: %d: number of media items */
								_n(
									'%d item',
									'%d items',
									total,
									'modula-best-grid-gallery'
								),
								total
							)
						: ''
				}
			>
				<MediaPickerSearch
					label={__('Search media', 'modula-best-grid-gallery')}
					placeholder={__(
						'Search media…',
						'modula-best-grid-gallery'
					)}
					value={search}
					onChange={setSearch}
				/>
				<Select
					aria-label={__('Date', 'modula-best-grid-gallery')}
					options={[
						{
							value: '',
							label: __('All dates', 'modula-best-grid-gallery'),
						},
						...monthOptions,
					]}
					value={month}
					onChange={setMonth}
				/>
			</MediaPickerToolbar>

			<MediaPickerGrid
				items={items}
				selectedIds={selectedIds}
				onToggle={toggle}
				message={libraryMessage(
					library,
					items.length === 0,
					isFiltered
				)}
				hasMore={library.hasNextPage}
				isLoadingMore={library.isFetchingNextPage}
				onLoadMore={() => void library.fetchNextPage()}
			/>

			<MediaPickerFooter
				count={selectedIds.size}
				addLabel={
					selectedIds.size > 0
						? sprintf(
								/* translators: %d: number of selected images */
								_n(
									'Add %d image',
									'Add %d images',
									selectedIds.size,
									'modula-best-grid-gallery'
								),
								selectedIds.size
							)
						: __('Add images', 'modula-best-grid-gallery')
				}
				busy={busy}
				onClear={() => setSelectedIds(new Set())}
				onAdd={() => onAdd([...selectedIds])}
			/>
		</>
	);
}

/**
 * Loading, failure or empty-result line above the grid.
 *
 * @param {ReturnType<typeof useMediaLibraryQuery>} library
 * @param {boolean}                                 isEmpty
 * @param {boolean}                                 isFiltered
 * @return {string} The line; empty when the grid speaks for itself.
 */
function libraryMessage(library, isEmpty, isFiltered) {
	if (library.isPending) {
		return __('Loading media…', 'modula-best-grid-gallery');
	}
	if (library.isError) {
		return __(
			'The media library could not be loaded.',
			'modula-best-grid-gallery'
		);
	}
	if (isEmpty && isFiltered) {
		return __('Nothing matches your search', 'modula-best-grid-gallery');
	}
	if (isEmpty) {
		return __(
			'The media library has no images yet',
			'modula-best-grid-gallery'
		);
	}
	return '';
}
