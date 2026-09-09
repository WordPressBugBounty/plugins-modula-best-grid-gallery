import { useEffect, useRef } from '@wordpress/element';
import { Icon, closeSmall, search } from '@wordpress/icons';
import { useDebouncedInput } from '@wordpress/compose';
import { __ } from '@wordpress/i18n';

/**
 * Debounced listing search field styled for the gallery listing toolbar.
 *
 * @param {{
 *   view: import('./viewToListingQuery').ListingView,
 *   onChangeView: (view: import('./viewToListingQuery').ListingView) => void,
 *   placeholder: string,
 * }} props
 */
export function ListingSearch({ view, onChangeView, placeholder }) {
	const [searchValue, setSearchValue, debouncedSearch] = useDebouncedInput(
		view.search ?? ''
	);

	useEffect(() => {
		setSearchValue(view.search ?? '');
	}, [view.search, setSearchValue]);

	const onChangeViewRef = useRef(onChangeView);
	const viewRef = useRef(view);

	useEffect(() => {
		onChangeViewRef.current = onChangeView;
		viewRef.current = view;
	}, [onChangeView, view]);

	useEffect(() => {
		const currentSearch = viewRef.current?.search ?? '';
		if (debouncedSearch !== currentSearch) {
			onChangeViewRef.current({
				...viewRef.current,
				page: 1,
				search: debouncedSearch,
			});
		}
	}, [debouncedSearch]);

	const hasValue = Boolean(searchValue);

	return (
		<div className="modula-gallery-listing__search">
			<span
				className="modula-gallery-listing__search-icon-wrap"
				aria-hidden
			>
				<Icon icon={search} size={16} />
			</span>
			<input
				type="search"
				className="modula-gallery-listing__search-input"
				value={searchValue}
				onChange={(event) => setSearchValue(event.target.value)}
				placeholder={placeholder}
				aria-label={placeholder}
			/>
			{hasValue ? (
				<button
					type="button"
					className="modula-gallery-listing__search-clear"
					onClick={() => setSearchValue('')}
					aria-label={__('Clear search', 'modula-best-grid-gallery')}
				>
					<Icon icon={closeSmall} size={20} />
				</button>
			) : null}
		</div>
	);
}
