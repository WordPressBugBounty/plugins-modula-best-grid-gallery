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
import { useQueryClient } from '@tanstack/react-query';
import { getGalleryListingConfig } from './config';
import { getListingFields } from './fields';
import { buildCreateGalleryUrl } from './listingCreateGalleryUrl';
import { ListingPaginationFooter } from './ListingPaginationFooter';
import { ListingSearchSummary } from './ListingSearchSummary';
import { ListingToolbar } from './ListingToolbar';
import { EditorChoiceModal } from './EditorChoiceModal';
import { ListingQuickEditModal } from './ListingQuickEditModal';
import { shouldShowBetaEditorPrompt } from './listingBetaEditorPrompt';
import { shouldShowMixedStackNotice } from './listingMixedStackNotice';
import { openListingApplyPreset } from './listingApplyPreset';
import { ListingSelectAllChooserDialog } from './ListingSelectAllChooserDialog';
import {
	getListingSelectionBulkActions,
	isListingSelectionCheckboxTarget,
	listingSelectionItemId,
	resolveListingSelectionChange,
	selectListingRowsByChoice,
} from './listingSelection';
import { useClassicEditorPreferenceMutation } from './query/useClassicEditorPreferenceMutation';
import { useTryBetaGalleryMutation } from './query/useTryBetaGalleryMutation';
import { useConvertBetaGalleryMutation } from './query/useConvertBetaGalleryMutation';
import { useRestoreClassicEditorMutation } from './query/useRestoreClassicEditorMutation';
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
import { useListingRowPostDocumentMutation } from './query/useListingRowPostDocumentMutation';
import { useListingViewMutation } from './query/useListingViewMutation';
import { useListingViewQuery } from './query/useListingViewQuery';
import {
	isListingQuickEditEligible,
	listingQuickEditItemKey,
} from './listingQuickEdit';
import { DEFAULT_LISTING_VIEW, viewToListingQuery } from './viewToListingQuery';

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
	const queryClient = useQueryClient();
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
	const [quickEditItem, setQuickEditItem] = useState(
		/** @type {import('./listingRowToFields').ListingRow|null} */ (null)
	);
	const saveTimerRef = useRef(null);
	const listingRef = useRef(null);
	/** Only checkbox-column interactions may change listing selection (not row clicks). */
	const selectionFromCheckboxRef = useRef(false);
	const [saveResult, setSaveResult] = useState(null);
	const [refreshBusy, setRefreshBusy] = useState(false);
	const [focusKey, setFocusKey] = useState(null);
	const [selection, setSelection] = useState(/** @type {string[]} */ ([]));
	const [selectionNotice, setSelectionNotice] = useState(
		/** @type {string|null} */ (null)
	);
	const [selectAllChooserOptions, setSelectAllChooserOptions] = useState(
		/** @type {import('./listingSelection').ListingSelectAllChoice[]|null} */ (
			null
		)
	);
	const { data, isLoading, isError, error, refetch } = useListingQuery(view);
	const duplicateMutation = useDuplicateListingRowMutation();
	const lifecycleMutation = useListingRowLifecycleMutation();
	const { mutateAsync: savePostDocument } = useListingRowPostDocumentMutation(
		{ refreshListing: false }
	);
	const classicEditorPreferenceMutation =
		useClassicEditorPreferenceMutation();
	const tryBetaGalleryMutation = useTryBetaGalleryMutation();
	const convertBetaGalleryMutation = useConvertBetaGalleryMutation();
	const restoreClassicEditorMutation = useRestoreClassicEditorMutation();

	const closeEditorChoice = useCallback(() => {
		setEditorChoiceMode(null);
		setPendingEditItem(null);
	}, []);

	const requestGalleryEdit = useCallback(
		(item) => {
			if (!item?.editUrl) {
				return;
			}
			if (
				shouldShowBetaEditorPrompt(item, {
					albumTakeoverAvailable: config.albumTakeoverAvailable,
				})
			) {
				setPendingEditItem(item);
				setEditorChoiceMode('open');
				return;
			}
			window.location.href = item.editUrl;
		},
		[config.albumTakeoverAvailable]
	);

	const cancelQuickEdit = useCallback(() => {
		setFocusKey(listingQuickEditItemKey(quickEditItem));
		setQuickEditItem(null);
	}, [quickEditItem]);

	const requestQuickEdit = useCallback((item) => {
		if (!isListingQuickEditEligible(item)) {
			return;
		}
		setSaveResult(null);
		// Capture the edit session; query refreshes must not replace its draft.
		setQuickEditItem(item);
	}, []);

	const refreshSavedListing = useCallback(
		async (item, saved) => {
			setRefreshBusy(true);
			try {
				const result = await refetch({ throwOnError: true });
				const present = result.data?.rows?.some(
					(row) =>
						listingQuickEditItemKey(row) ===
						listingQuickEditItemKey(item)
				);
				const statusFilter = viewToListingQuery(view).status;
				const excluded =
					!present &&
					typeof saved?.status === 'string' &&
					typeof statusFilter === 'string' &&
					!statusFilter.split(',').includes(saved.status);
				setSaveResult({
					item,
					saved,
					failed: false,
					message: excluded
						? __(
								'Changes saved. This item no longer matches the status filter.',
								'modula-best-grid-gallery'
							)
						: present
							? __('Changes saved.', 'modula-best-grid-gallery')
							: __(
									'Changes saved. This item is not visible in the current listing view.',
									'modula-best-grid-gallery'
								),
				});
			} catch (refreshError) {
				setSaveResult({
					item,
					saved,
					failed: true,
					message: __(
						'Changes saved, but the listing could not be refreshed. Refresh the listing to see the saved values.',
						'modula-best-grid-gallery'
					),
				});
			} finally {
				setRefreshBusy(false);
				setFocusKey(listingQuickEditItemKey(item));
			}
		},
		[refetch, view]
	);

	const saveQuickEdit = useCallback(
		async (item, document) => {
			const saved = await savePostDocument({ item, document });
			await refreshSavedListing(item, saved);
			setQuickEditItem(null);
		},
		[savePostDocument, refreshSavedListing]
	);

	useEffect(() => {
		if (quickEditItem || !focusKey) {
			return;
		}
		const frame = window.requestAnimationFrame(() => {
			const root = listingRef.current;
			const shortcut = Array.from(
				root?.querySelectorAll('[data-quick-edit-key]') || []
			).find(
				(element) =>
					element.getAttribute('data-quick-edit-key') === focusKey
			);
			const target =
				shortcut || root?.querySelector('input[type="search"]') || root;
			if (target?.isConnected) {
				target.focus();
			}
			setFocusKey(null);
		});
		return () => window.cancelAnimationFrame(frame);
	}, [quickEditItem, focusKey, data]);

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
			restoreClassicEditor: (item) =>
				restoreClassicEditorMutation.mutateAsync(item),
			applyListingPreset: async (items) => {
				const result = await openListingApplyPreset(items);
				if (result?.unavailable) {
					setSelectionNotice(
						__(
							'Apply preset is unavailable right now. Refresh the page and try again.',
							'modula-best-grid-gallery'
						)
					);
					return result;
				}
				if (!result || !(result.applied > 0)) {
					return result;
				}
				setSelection([]);
				setSelectionNotice(null);
				await queryClient.invalidateQueries({
					queryKey: ['modula-listing'],
				});
				return result;
			},
		}),
		// mutateAsync identities are stable enough for this shell.
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[
			duplicateMutation.mutateAsync,
			lifecycleMutation.mutateAsync,
			requestGalleryEdit,
			tryBetaGalleryMutation.mutateAsync,
			convertBetaGalleryMutation.mutateAsync,
			restoreClassicEditorMutation.mutateAsync,
			queryClient,
		]
	);
	const fields = useMemo(
		() =>
			getListingFields({
				hasAlbums: config.hasAlbums,
				canUseBulkEditor: config.canUseBulkEditor,
				albumTakeoverAvailable: config.albumTakeoverAvailable,
				rowActionHandlers,
				requestGalleryEdit,
				requestQuickEdit,
			}),
		[
			config.hasAlbums,
			config.canUseBulkEditor,
			config.albumTakeoverAvailable,
			rowActionHandlers,
			requestGalleryEdit,
			requestQuickEdit,
		]
	);

	useEffect(() => {
		if (viewReady || viewQuery.isLoading) {
			return;
		}
		setView(
			sanitizeListingOnlyShowFilters(
				mergePersistedListingView(viewQuery.data),
				{
					hasAlbums: config.hasAlbums,
					isPro: config.isPro,
				}
			)
		);
		setViewReady(true);
	}, [
		viewQuery.data,
		viewQuery.isLoading,
		viewReady,
		config.hasAlbums,
		config.isPro,
	]);

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

	const rows = useMemo(() => data?.rows || [], [data?.rows]);
	const pagination = data?.pagination || {
		total: 0,
		pages: 0,
		page: 1,
		perPage: view.perPage || 20,
	};
	const totals = data?.totals || { rows: 0, items: 0 };
	const statusCounts = data?.statusCounts || null;
	const selectionBulkActions = useMemo(
		() => getListingSelectionBulkActions(),
		[]
	);
	const handleChangeSelection = useCallback(
		(nextSelection) => {
			// DataViews toggles selection on the whole <tr> click. Product rule:
			// listing selection is checkbox-only (and header select-all).
			if (!selectionFromCheckboxRef.current) {
				return;
			}
			selectionFromCheckboxRef.current = false;
			const result = resolveListingSelectionChange({
				currentSelection: selection,
				nextSelection,
				pageRows: rows,
			});
			setSelection(result.selection);
			setSelectionNotice(result.notice);
			setSelectAllChooserOptions(result.chooserOptions);
		},
		[selection, rows]
	);

	useEffect(() => {
		const root = listingRef.current;
		if (!root) {
			return undefined;
		}
		const markCheckboxSource = (event) => {
			selectionFromCheckboxRef.current =
				isListingSelectionCheckboxTarget(event.target);
		};
		const markCheckboxKey = (event) => {
			if (event.key !== ' ' && event.key !== 'Enter') {
				return;
			}
			markCheckboxSource(event);
		};
		root.addEventListener('pointerdown', markCheckboxSource, true);
		root.addEventListener('keydown', markCheckboxKey, true);
		return () => {
			root.removeEventListener('pointerdown', markCheckboxSource, true);
			root.removeEventListener('keydown', markCheckboxKey, true);
		};
	}, [viewReady]);

	const cancelSelectAllChooser = useCallback(() => {
		setSelectAllChooserOptions(null);
	}, []);

	const chooseSelectAll = useCallback(
		(choice) => {
			setSelection(selectListingRowsByChoice(choice, rows));
			setSelectionNotice(null);
			setSelectAllChooserOptions(null);
		},
		[rows]
	);

	useEffect(() => {
		setSelection([]);
		setSelectionNotice(null);
		setSelectAllChooserOptions(null);
	}, [
		view.page,
		view.perPage,
		view.search,
		view.filters,
		view.sort?.field,
		view.sort?.direction,
	]);

	const isMutating =
		duplicateMutation.isPending ||
		lifecycleMutation.isPending ||
		classicEditorPreferenceMutation.isPending ||
		tryBetaGalleryMutation.isPending ||
		convertBetaGalleryMutation.isPending ||
		restoreClassicEditorMutation.isPending;
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
		if (!config.albumTakeoverAvailable) {
			window.location.href = config.newAlbumUrl;
			return;
		}
		setPendingEditItem(null);
		setEditorChoiceMode('create-album');
	}, [config.newAlbumUrl, config.albumTakeoverAvailable]);

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
		<div className="modula-gallery-listing" ref={listingRef} tabIndex={-1}>
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

			{selectionNotice ? (
				<Notice
					className="modula-gallery-listing__selection-notice"
					status="warning"
					isDismissible
					onRemove={() => setSelectionNotice(null)}
				>
					{selectionNotice}
				</Notice>
			) : null}

			{saveResult ? (
				<Notice
					status={saveResult.failed ? 'warning' : 'success'}
					spokenMessage={saveResult.message}
					isDismissible={false}
				>
					<span>{saveResult.message}</span>
					{saveResult.failed ? (
						<Button
							variant="secondary"
							disabled={refreshBusy}
							onClick={() =>
								refreshSavedListing(
									saveResult.item,
									saveResult.saved
								)
							}
						>
							{__('Refresh listing', 'modula-best-grid-gallery')}
						</Button>
					) : null}
				</Notice>
			) : null}
			{isError && !saveResult?.failed ? (
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
					getItemId={(item) => listingSelectionItemId(item) || ''}
					isLoading={listingBusy}
					search={false}
					selection={selection}
					onChangeSelection={handleChangeSelection}
					actions={selectionBulkActions}
				>
					<div className="modula-gallery-listing__controls">
						<ListingToolbar
							view={view}
							onChangeView={handleChangeView}
							statusCounts={statusCounts}
							hasAlbums={config.hasAlbums}
							isPro={config.isPro}
							selection={selection}
							pageRows={rows}
							canUseApplyPreset={config.canUseApplyPreset}
							onApplyPreset={
								config.canUseApplyPreset
									? rowActionHandlers.applyListingPreset
									: undefined
							}
							trashListingRows={
								rowActionHandlers.trashListingRows
							}
							restoreListingRows={
								rowActionHandlers.restoreListingRows
							}
							deleteListingRows={
								rowActionHandlers.deleteListingRows
							}
							onSelectionCleared={() => {
								setSelection([]);
								setSelectionNotice(null);
								setSelectAllChooserOptions(null);
							}}
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
			{quickEditItem ? (
				<ListingQuickEditModal
					item={quickEditItem}
					onCancel={cancelQuickEdit}
					onSave={(document) =>
						saveQuickEdit(quickEditItem, document)
					}
				/>
			) : null}
			<EditorChoiceModal
				isOpen={editorChoiceMode !== null}
				mode={editorChoiceMode === 'open' ? 'open' : 'create'}
				heroUrl={config.editorChoiceHeroUrl}
				onClose={closeEditorChoice}
				onChoose={handleEditorChoice}
			/>
			<ListingSelectAllChooserDialog
				options={selectAllChooserOptions}
				onChoose={chooseSelectAll}
				onCancel={cancelSelectAllChooser}
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
