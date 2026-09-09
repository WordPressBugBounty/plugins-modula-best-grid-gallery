import {
	useEffect,
	useMemo,
	useRef,
	useState,
	useCallback,
} from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Button, Notice } from '@wordpress/components';
import { DataViews } from '@wordpress/dataviews/wp';
import { getGalleryListingConfig } from './config';
import { getListingFields } from './fields';
import { buildCreateGalleryUrl } from './listingCreateGalleryUrl';
import { ListingPaginationFooter } from './ListingPaginationFooter';
import { ListingSearchSummary } from './ListingSearchSummary';
import { ListingToolbar } from './ListingToolbar';
import { EditorChoiceModal } from './EditorChoiceModal';
import { shouldShowBetaEditorPrompt } from './listingBetaEditorPrompt';
import { shouldShowMixedStackNotice } from './listingMixedStackNotice';
import { useClassicEditorPreferenceMutation } from './query/useClassicEditorPreferenceMutation';
import { useTryBetaGalleryMutation } from './query/useTryBetaGalleryMutation';
import { useConvertBetaGalleryMutation } from './query/useConvertBetaGalleryMutation';
import {
	mergePersistedListingView,
	normalizeListingViewFields,
} from './listingViewPersistence';
import {
	getActiveListingSearch,
	sanitizeListingOnlyShowFilters,
} from './listingToolbarView';
import { useDuplicateListingRowMutation } from './query/useDuplicateListingRowMutation';
import { useListingQuery } from './query/useListingQuery';
import { useListingRowLifecycleMutation } from './query/useListingRowLifecycleMutation';
import { useListingViewMutation } from './query/useListingViewMutation';
import { useListingViewQuery } from './query/useListingViewQuery';
import { DEFAULT_LISTING_VIEW } from './viewToListingQuery';

const DEFAULT_LAYOUTS = {
	table: {
		layout: {
			primaryField: 'gallery',
		},
	},
	grid: {
		layout: {
			previewSize: 200,
		},
	},
};

/**
 * Gallery listing app shell.
 */
export default function GalleryListingApp() {
	const config = getGalleryListingConfig();
	const viewQuery = useListingViewQuery();
	const viewMutation = useListingViewMutation();
	const [view, setView] = useState(DEFAULT_LISTING_VIEW);
	const [viewReady, setViewReady] = useState(false);
	const [editorChoiceMode, setEditorChoiceMode] = useState(
		/** @type {'create'|'create-album'|'open'|null} */ (null)
	);
	const [pendingEditItem, setPendingEditItem] = useState(
		/** @type {import('./listingRowToFields').ListingRow|null} */ (null)
	);
	const saveTimerRef = useRef(null);
	const { data, isLoading, isError, error } = useListingQuery(view);
	const duplicateMutation = useDuplicateListingRowMutation();
	const lifecycleMutation = useListingRowLifecycleMutation();
	const classicEditorPreferenceMutation =
		useClassicEditorPreferenceMutation();
	const tryBetaGalleryMutation = useTryBetaGalleryMutation();
	const convertBetaGalleryMutation = useConvertBetaGalleryMutation();

	const closeEditorChoice = useCallback(() => {
		setEditorChoiceMode(null);
		setPendingEditItem(null);
	}, []);

	const requestGalleryEdit = useCallback((item) => {
		if (!item?.editUrl) {
			return;
		}
		if (shouldShowBetaEditorPrompt(item)) {
			setPendingEditItem(item);
			setEditorChoiceMode('open');
			return;
		}
		window.location.href = item.editUrl;
	}, []);

	const rowActionHandlers = useMemo(
		() => ({
			duplicateListingRow: (item) => duplicateMutation.mutateAsync(item),
			trashListingRows: (items) =>
				lifecycleMutation.mutateAsync({ action: 'trash', items }),
			restoreListingRows: (items) =>
				lifecycleMutation.mutateAsync({ action: 'restore', items }),
			deleteListingRows: (items) =>
				lifecycleMutation.mutateAsync({ action: 'delete', items }),
			requestGalleryEdit,
			tryBetaGallery: (item) => tryBetaGalleryMutation.mutateAsync(item),
			convertBetaGallery: (item) =>
				convertBetaGalleryMutation.mutateAsync(item),
		}),
		// mutateAsync identities are stable enough for this shell.
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[
			duplicateMutation.mutateAsync,
			lifecycleMutation.mutateAsync,
			requestGalleryEdit,
			tryBetaGalleryMutation.mutateAsync,
			convertBetaGalleryMutation.mutateAsync,
		]
	);
	const fields = useMemo(
		() =>
			getListingFields({
				hasAlbums: config.hasAlbums,
				rowActionHandlers,
				requestGalleryEdit,
			}),
		[config.hasAlbums, rowActionHandlers, requestGalleryEdit]
	);

	useEffect(() => {
		if (viewReady || viewQuery.isLoading) {
			return;
		}
		setView(
			sanitizeListingOnlyShowFilters(mergePersistedListingView(viewQuery.data), {
				hasAlbums: config.hasAlbums,
				isPro: config.isPro,
			})
		);
		setViewReady(true);
	}, [viewQuery.data, viewQuery.isLoading, viewReady, config.hasAlbums, config.isPro]);

	useEffect(() => {
		return () => {
			if (saveTimerRef.current) {
				window.clearTimeout(saveTimerRef.current);
			}
		};
	}, []);

	const handleChangeView = (nextView) => {
		const sanitizedView = sanitizeListingOnlyShowFilters(nextView, {
			hasAlbums: config.hasAlbums,
			isPro: config.isPro,
		});
		const normalizedView = {
			...sanitizedView,
			fields: normalizeListingViewFields(sanitizedView),
		};
		setView(normalizedView);
		if (!viewReady) {
			return;
		}
		if (saveTimerRef.current) {
			window.clearTimeout(saveTimerRef.current);
		}
		saveTimerRef.current = window.setTimeout(() => {
			viewMutation.mutate({
				...normalizedView,
				fields: normalizeListingViewFields(normalizedView),
			});
		}, 400);
	};

	const rows = data?.rows || [];
	const pagination = data?.pagination || {
		total: 0,
		pages: 0,
		page: 1,
		perPage: view.perPage || 20,
	};
	const totals = data?.totals || { rows: 0, items: 0 };
	const statusCounts = data?.statusCounts || null;
	const isMutating =
		duplicateMutation.isPending ||
		lifecycleMutation.isPending ||
		classicEditorPreferenceMutation.isPending ||
		tryBetaGalleryMutation.isPending ||
		convertBetaGalleryMutation.isPending;
	const listingBusy =
		!viewReady || viewQuery.isLoading || isLoading || isMutating;

	const hasActiveQuery =
		Boolean(getActiveListingSearch(view)) ||
		(Array.isArray(view.filters) && view.filters.length > 0);
	const activeSearch = getActiveListingSearch(view);

	const openCreateEditorChoice = useCallback(() => {
		if (!config.postNewUrl) {
			return;
		}
		setPendingEditItem(null);
		setEditorChoiceMode('create');
	}, [config.postNewUrl]);

	const openCreateAlbumEditorChoice = useCallback(() => {
		if (!config.newAlbumUrl) {
			return;
		}
		setPendingEditItem(null);
		setEditorChoiceMode('create-album');
	}, [config.newAlbumUrl]);

	const chooseEditorAndCreate = useCallback(
		(choice) => {
			const creatingAlbum = 'create-album' === editorChoiceMode;
			const href = buildCreateGalleryUrl({
				postNewUrl: creatingAlbum
					? config.newAlbumUrl
					: config.postNewUrl,
				queryArg: config.editorChoiceQueryArg,
				createNonce: creatingAlbum
					? config.createAlbumNonce
					: config.createGalleryNonce,
				choice,
			});
			if (!href) {
				return;
			}
			window.location.href = href;
		},
		[
			editorChoiceMode,
			config.newAlbumUrl,
			config.postNewUrl,
			config.editorChoiceQueryArg,
			config.createAlbumNonce,
			config.createGalleryNonce,
		]
	);

	const chooseEditorForOpen = useCallback(
		async (choice) => {
			const item = pendingEditItem;
			if (!item?.editUrl) {
				closeEditorChoice();
				return;
			}

			if ('classic' === choice) {
				try {
					await classicEditorPreferenceMutation.mutateAsync(item);
				} catch (e) {
					closeEditorChoice();
					return;
				}
				window.location.href = item.editUrl;
				return;
			}

			try {
				const result = await tryBetaGalleryMutation.mutateAsync(item);
				if (result?.editUrl) {
					window.location.href = result.editUrl;
					return;
				}
			} catch (e) {
				closeEditorChoice();
				return;
			}

			closeEditorChoice();
		},
		[
			pendingEditItem,
			closeEditorChoice,
			classicEditorPreferenceMutation,
			tryBetaGalleryMutation,
		]
	);

	const handleEditorChoice = useCallback(
		(choice) => {
			if ('open' === editorChoiceMode) {
				void chooseEditorForOpen(choice);
				return;
			}
			chooseEditorAndCreate(choice);
		},
		[editorChoiceMode, chooseEditorForOpen, chooseEditorAndCreate]
	);

	return (
		<div className="modula-gallery-listing">
			<header className="modula-gallery-listing__header">
				<div className="modula-gallery-listing__header-brand">
					{config.logoUrl ? (
						<img
							className="modula-gallery-listing__logo"
							src={config.logoUrl}
							alt={__('Modula', 'modula-best-grid-gallery')}
							width={40}
							height={40}
							decoding="async"
						/>
					) : null}
					<div className="modula-gallery-listing__header-text">
						<h1 className="modula-gallery-listing__title-heading">
							{__('Galleries', 'modula-best-grid-gallery')}
						</h1>
						<p className="modula-gallery-listing__counts">
							{formatListingCounts(totals.rows, totals.items)}
						</p>
					</div>
				</div>
				<div className="modula-gallery-listing__header-actions">
					{config.postNewUrl ? (
						<Button
							variant="primary"
							onClick={openCreateEditorChoice}
						>
							{__('+ New gallery', 'modula-best-grid-gallery')}
						</Button>
					) : null}
					{config.canCreateAlbum && config.newAlbumUrl ? (
						<Button
							variant="secondary"
							onClick={openCreateAlbumEditorChoice}
						>
							{__('+ New album', 'modula-best-grid-gallery')}
						</Button>
					) : null}
				</div>
			</header>

			{shouldShowMixedStackNotice(data?.stack) ? (
				<Notice
					className="modula-gallery-listing__mixed-stack-notice"
					status="warning"
					isDismissible={false}
				>
					{__(
						'Galleries that use the new editor and galleries that use the classic editor cannot be displayed on the same page.',
						'modula-best-grid-gallery'
					)}
				</Notice>
			) : null}

			{isError ? (
				<p className="modula-gallery-listing__error" role="alert">
					{error?.message ||
						__(
							'Could not load galleries.',
							'modula-best-grid-gallery'
						)}
				</p>
			) : null}

			{viewReady &&
			!listingBusy &&
			!isError &&
			rows.length === 0 &&
			!hasActiveQuery ? (
				<div className="modula-gallery-listing__empty">
					<p>
						{config.hasAlbums
							? __(
									'No galleries or albums yet.',
									'modula-best-grid-gallery'
								)
							: __(
									'No galleries yet.',
									'modula-best-grid-gallery'
								)}
					</p>
					<div className="modula-gallery-listing__empty-actions">
						{config.postNewUrl ? (
							<Button
								variant="primary"
								onClick={openCreateEditorChoice}
							>
								{__(
									'+ New gallery',
									'modula-best-grid-gallery'
								)}
							</Button>
						) : null}
						{config.canCreateAlbum && config.newAlbumUrl ? (
							<Button
								variant="secondary"
								onClick={openCreateAlbumEditorChoice}
							>
								{__('+ New album', 'modula-best-grid-gallery')}
							</Button>
						) : null}
					</div>
				</div>
			) : viewReady ? (
				<DataViews
					data={rows}
					fields={fields}
					view={view}
					onChangeView={handleChangeView}
					paginationInfo={{
						totalItems: pagination.total,
						totalPages: Math.max(1, pagination.pages),
					}}
					defaultLayouts={DEFAULT_LAYOUTS}
					getItemId={(item) => `${item.type}-${item.id}`}
					isLoading={listingBusy}
					search={false}
				>
					<div className="modula-gallery-listing__controls">
						<ListingToolbar
							view={view}
							onChangeView={handleChangeView}
							statusCounts={statusCounts}
							hasAlbums={config.hasAlbums}
							isPro={config.isPro}
						/>
						{activeSearch ? (
							<ListingSearchSummary
								view={view}
								total={pagination.total}
								onChangeView={handleChangeView}
							/>
						) : null}
					</div>
					<DataViews.Layout />
					<ListingPaginationFooter
						view={view}
						onChangeView={handleChangeView}
						totalItems={pagination.total}
						totalPages={Math.max(1, pagination.pages)}
					/>
				</DataViews>
			) : null}
			<EditorChoiceModal
				isOpen={editorChoiceMode !== null}
				mode={editorChoiceMode === 'open' ? 'open' : 'create'}
				heroUrl={config.editorChoiceHeroUrl}
				onClose={closeEditorChoice}
				onChoose={handleEditorChoice}
			/>
		</div>
	);
}

/**
 * @param {number} rows
 * @param {number} items
 * @return {string}
 */
function formatListingCounts(rows, items) {
	const galleryLabel =
		1 === rows
			? __('1 gallery', 'modula-best-grid-gallery')
			: `${rows} ${__('galleries', 'modula-best-grid-gallery')}`;
	const itemLabel =
		1 === items
			? __('1 item', 'modula-best-grid-gallery')
			: `${items} ${__('items', 'modula-best-grid-gallery')}`;
	return `${galleryLabel} · ${itemLabel}`;
}
