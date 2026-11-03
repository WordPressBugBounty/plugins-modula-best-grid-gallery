import {
	useEffect,
	useMemo,
	useRef,
	useState,
	useCallback,
} from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { useQueryClient } from '@tanstack/react-query';
import {
	AdminUiRoot,
	Button,
	LicenseExpiredBanner,
	Notice,
	Pagination,
	Table,
	Toast,
} from 'admin-ui';
import { licenseRenewHref } from 'gallery-shared/utils/licenseRenewHref';
import { getContentPageConfig } from './config';
import {
	getContentSections,
	getHeaderCreateActions,
	resolveContentSection,
} from './contentSections';
import { ContentPageHeader } from './ContentPageHeader';
import { ContentSectionTabs } from './ContentSectionTabs';
import { ContentSectionUpsell } from './ContentSectionUpsell';
import { getCreatePresetOptions } from './listingCreatePresets';
import { getListingColumns } from './listingColumns';
import { ListingSearchSummary } from './ListingSearchSummary';
import { ListingToolbar } from './ListingToolbar';
import { EditorChoiceModal } from './EditorChoiceModal';
import { ListingQuickEditPanel } from './ListingQuickEditPanel';
import {
	completeCreateEditorChoice,
	completeDismissEditorChoice,
	navigateAdminHref,
	skipActiveViewTransition,
} from './completeEditorChoice';
import { shouldShowBetaEditorPrompt } from './listingBetaEditorPrompt';
import { shouldShowCreateOnlyEmptyState } from './listingEmptyState';
import {
	getListingApplyPresetFeedback,
	openListingApplyPreset,
} from './listingApplyPreset';
import {
	formatListingBulkConvertToast,
	runListingBulkConvert,
} from './listingBulkConvert';
import { ListingSelectAllChooserDialog } from './ListingSelectAllChooserDialog';
import {
	isListingRowSelectable,
	listingSelectionItemId,
	resolveListingSelectionChange,
	selectListingRowsByChoice,
} from './listingSelection';
import { useClassicEditorPreferenceMutation } from './query/useClassicEditorPreferenceMutation';
import { useTryBetaGalleryMutation } from './query/useTryBetaGalleryMutation';
import {
	postConvertBetaGallery,
	useConvertBetaGalleryMutation,
} from './query/useConvertBetaGalleryMutation';
import { useRestoreClassicEditorMutation } from './query/useRestoreClassicEditorMutation';
import { mergePersistedListingView } from './listingViewPersistence';
import {
	applyListingTypeFilter,
	getActiveListingSearch,
	getListingSegment,
	getListingViewStatuses,
} from './listingToolbarView';
import { getListingEmptyMessage, getListingRowNoun } from './listingTable';
import { useDuplicateListingRowMutation } from './query/useDuplicateListingRowMutation';
import { useListingQuery } from './query/useListingQuery';
import { getProExpiredTypeKeys } from './listingProExpired';
import { useProExpiredCountQuery } from './query/useProExpiredCountQuery';
import { useListingRowLifecycleMutation } from './query/useListingRowLifecycleMutation';
import { useListingRowPostDocumentMutation } from './query/useListingRowPostDocumentMutation';
import { useListingViewMutation } from './query/useListingViewMutation';
import { useListingViewQuery } from './query/useListingViewQuery';
import {
	getListingQuickEditSavedMessage,
	isListingQuickEditEligible,
	listingQuickEditItemKey,
} from './listingQuickEdit';
import { DEFAULT_LISTING_VIEW } from './viewToListingQuery';
import { decodeListingTitle } from './listingRowToFields';

/**
 * Content page app shell.
 */
export default function ContentPageApp() {
	// The bootstrap is printed once; read it once.
	const config = useMemo(() => getContentPageConfig(), []);
	const createPresetOptions = useMemo(
		() =>
			getCreatePresetOptions({
				galleryPresets: config.galleryPresets,
				defaultGalleryPresetId: config.defaultGalleryPresetId,
			}),
		[config.galleryPresets, config.defaultGalleryPresetId]
	);
	const queryClient = useQueryClient();
	const viewQuery = useListingViewQuery();
	const viewMutation = useListingViewMutation();
	const [view, setView] = useState(DEFAULT_LISTING_VIEW);
	// The latest view, for changes reported back to back (rows per page, then page 1).
	const viewRef = useRef(view);
	const [viewReady, setViewReady] = useState(false);
	// A section upsell (Lite) replaces the list for this visit only; the
	// saved view keeps the list section under it.
	const [upsellSection, setUpsellSection] = useState(
		/** @type {string|null} */ (null)
	);
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
	// A save whose listing refresh failed; its notice retries the refresh.
	const [refreshFailure, setRefreshFailure] = useState(null);
	// One toast for Quick edit saves, bulk Convert and Apply preset.
	const [toastMessage, setToastMessage] = useState('');
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
	const proExpiredTypeKeys = useMemo(
		() => getProExpiredTypeKeys(config),
		[config]
	);
	const { data: proExpiredCount = 0 } =
		useProExpiredCountQuery(proExpiredTypeKeys);
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
		skipActiveViewTransition(
			typeof document !== 'undefined' ? document : undefined
		);
		setEditorChoiceMode(null);
		setPendingEditItem(null);
		if (listingRef.current) {
			listingRef.current.focus();
		}
	}, []);

	const dismissEditorChoice = useCallback(() => {
		completeDismissEditorChoice({
			close: closeEditorChoice,
		});
	}, [closeEditorChoice]);

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
				skipActiveViewTransition(
					typeof document !== 'undefined' ? document : undefined
				);
				setPendingEditItem(item);
				setEditorChoiceMode('open');
				return;
			}
			navigateAdminHref(item.editUrl);
		},
		[config.albumTakeoverAvailable]
	);

	// The row whose Quick edit save is in flight.
	const quickEditSavingKeyRef = useRef(null);

	// Cancel and Escape; a panel whose save is in flight stays open. The
	// Table's expansion row returns focus to Quick Edit as it closes.
	const cancelQuickEdit = useCallback(() => {
		setQuickEditItem((current) =>
			null !== quickEditSavingKeyRef.current &&
			listingQuickEditItemKey(current) === quickEditSavingKeyRef.current
				? current
				: null
		);
	}, []);

	const requestQuickEdit = useCallback((item) => {
		if (!isListingQuickEditEligible(item)) {
			return;
		}
		setRefreshFailure(null);
		setToastMessage('');
		// Capture the edit session; query refreshes must not replace its draft.
		// One panel at a time: another row's Quick Edit replaces this one.
		setQuickEditItem(item);
	}, []);

	const refreshSavedListing = useCallback(
		async (item, saved) => {
			setRefreshBusy(true);
			try {
				const result = await refetch({ throwOnError: true });
				const isListed = !!result.data?.rows?.some(
					(row) =>
						listingQuickEditItemKey(row) ===
						listingQuickEditItemKey(item)
				);
				setRefreshFailure(null);
				setToastMessage(
					getListingQuickEditSavedMessage({
						item,
						saved,
						isListed,
						viewStatuses: getListingViewStatuses(view),
					})
				);
			} catch (refreshError) {
				setRefreshFailure({ item, saved });
			} finally {
				setRefreshBusy(false);
				setFocusKey(listingQuickEditItemKey(item));
			}
		},
		[refetch, view]
	);

	const saveQuickEdit = useCallback(
		async (item, document) => {
			const key = listingQuickEditItemKey(item);
			quickEditSavingKeyRef.current = key;
			try {
				const saved = await savePostDocument({ item, document });
				await refreshSavedListing(item, saved);
			} finally {
				quickEditSavingKeyRef.current = null;
			}
			// Close only this row's panel; Quick Edit on another row may have
			// opened one while the save ran.
			setQuickEditItem((current) =>
				listingQuickEditItemKey(current) === key ? null : current
			);
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
				const feedback = getListingApplyPresetFeedback(result);
				if (feedback?.type === 'notice') {
					setSelectionNotice(feedback.message);
				} else if (feedback?.type === 'toast') {
					setToastMessage(feedback.message);
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
			convertListingGalleries: async (items) => {
				const result = await runListingBulkConvert(
					items,
					postConvertBetaGallery
				);
				setToastMessage(formatListingBulkConvertToast(result));
				if (!(result.converted > 0)) {
					return result;
				}
				setSelection([]);
				setSelectionNotice(null);
				setSelectAllChooserOptions(null);
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
	useEffect(() => {
		if (viewReady || viewQuery.isLoading) {
			return;
		}
		const restored = mergePersistedListingView(viewQuery.data);
		const restoredView = {
			...restored,
			// A section saved under Pro (or the album CPT) may be gone.
			section: resolveContentSection(
				restored.section,
				getContentSections(config, null)
			),
		};
		viewRef.current = restoredView;
		setView(restoredView);
		setViewReady(true);
	}, [viewQuery.data, viewQuery.isLoading, viewReady, config]);

	useEffect(() => {
		return () => {
			if (saveTimerRef.current) {
				window.clearTimeout(saveTimerRef.current);
			}
		};
	}, []);

	const handleChangeView = (nextView) => {
		viewRef.current = nextView;
		setView(nextView);
		if (!viewReady) {
			return;
		}
		if (saveTimerRef.current) {
			window.clearTimeout(saveTimerRef.current);
		}
		saveTimerRef.current = window.setTimeout(() => {
			viewMutation.mutate(nextView);
		}, 400);
	};

	const rows = useMemo(() => data?.rows || [], [data?.rows]);
	const pagination = data?.pagination || {
		total: 0,
		pages: 0,
		page: 1,
		perPage: view.perPage || 20,
	};
	const statusCounts = data?.statusCounts || null;
	const sections = useMemo(
		() => getContentSections(config, data?.sectionCounts),
		[config, data?.sectionCounts]
	);
	const shownSection =
		upsellSection || resolveContentSection(view.section, sections);
	const createActions = getHeaderCreateActions(shownSection, config);
	// Only the checkboxes reach this: the table selects nothing on a row click.
	const handleChangeSelection = useCallback(
		(nextSelection, { selectAll }) => {
			const result = resolveListingSelectionChange({
				currentSelection: selection,
				nextSelection,
				pageRows: rows,
				fromHeader: selectAll,
			});
			setSelection(result.selection);
			setSelectionNotice(result.notice);
			setSelectAllChooserOptions(result.chooserOptions);
		},
		[selection, rows]
	);

	// After deletes or a smaller page size the page may be past the last one.
	useEffect(() => {
		const lastPage = Math.max(1, Number(data?.pagination?.pages) || 1);
		if (!data || viewRef.current.page <= lastPage) {
			return;
		}
		const corrected = { ...viewRef.current, page: lastPage };
		viewRef.current = corrected;
		setView(corrected);
	}, [data]);

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

	// Another page, search, filter or section shows other rows: the selection
	// and the Quick edit panel go.
	useEffect(() => {
		setSelection([]);
		setSelectionNotice(null);
		setSelectAllChooserOptions(null);
		setQuickEditItem(null);
	}, [
		view.page,
		view.perPage,
		view.search,
		view.segment,
		view.columnFilters,
		view.sort?.field,
		view.sort?.direction,
		view.section,
	]);

	const activeSearch = getActiveListingSearch(view);
	const showCreateOnlyEmptyState =
		shouldShowCreateOnlyEmptyState(statusCounts);
	const rowNoun = getListingRowNoun(shownSection, config.hasAlbums);

	const openCreateEditorChoice = useCallback(() => {
		if (!config.postNewUrl) {
			return;
		}
		skipActiveViewTransition(
			typeof document !== 'undefined' ? document : undefined
		);
		setPendingEditItem(null);
		setEditorChoiceMode('create');
	}, [config.postNewUrl]);

	const openCreateAlbumEditorChoice = useCallback(() => {
		if (!config.newAlbumUrl) {
			return;
		}
		skipActiveViewTransition(
			typeof document !== 'undefined' ? document : undefined
		);
		if (!config.albumTakeoverAvailable) {
			navigateAdminHref(config.newAlbumUrl);
			return;
		}
		setPendingEditItem(null);
		setEditorChoiceMode('create-album');
	}, [config.newAlbumUrl, config.albumTakeoverAvailable]);

	// A list section is saved with the view; an upsell only covers the list.
	const selectSection = (slug) => {
		const section = sections.find((candidate) => candidate.slug === slug);
		if (!section) {
			return;
		}
		if (section.upsell) {
			setUpsellSection(slug);
			return;
		}
		setUpsellSection(null);
		if (slug === view.section) {
			return;
		}
		// Each section lists its own types; a type checked in another one
		// would narrow this one to nothing.
		handleChangeView({
			...applyListingTypeFilter(view, []),
			section: slug,
		});
	};

	// Lite: Save as preset on a row opens the Presets section upsell.
	const presetsUpsell = sections.some(
		(section) => section.slug === 'presets' && section.upsell
	);
	const tableColumns = getListingColumns({
		view,
		onChangeView: handleChangeView,
		productTypes: data?.productTypes,
		proExpiredTypeKeys,
		canUseBulkEditor: config.canUseBulkEditor,
		albumTakeoverAvailable: config.albumTakeoverAvailable,
		rowActionHandlers,
		requestGalleryEdit,
		requestQuickEdit,
		onSaveAsPresetUpsell: presetsUpsell
			? () => selectSection('presets')
			: undefined,
	});
	const clearSelection = () => {
		setSelection([]);
		setSelectionNotice(null);
		setSelectAllChooserOptions(null);
	};

	const chooseEditorAndCreate = useCallback(
		(choice, start) => {
			completeCreateEditorChoice({
				choice,
				start,
				mode: editorChoiceMode,
				config,
				close: closeEditorChoice,
			});
		},
		[editorChoiceMode, config, closeEditorChoice]
	);

	const chooseEditorForOpen = useCallback(
		async (choice) => {
			const item = pendingEditItem;
			skipActiveViewTransition(
				typeof document !== 'undefined' ? document : undefined
			);
			closeEditorChoice();
			if (!item?.editUrl) {
				return;
			}

			if ('classic' === choice) {
				try {
					await classicEditorPreferenceMutation.mutateAsync(item);
				} catch {
					return;
				}
				navigateAdminHref(item.editUrl);
				return;
			}

			try {
				const result = await tryBetaGalleryMutation.mutateAsync(item);
				if (result?.editUrl) {
					navigateAdminHref(result.editUrl);
				}
			} catch {
				// Listing is already usable; the modal was closed first.
			}
		},
		[
			pendingEditItem,
			closeEditorChoice,
			classicEditorPreferenceMutation,
			tryBetaGalleryMutation,
		]
	);

	const handleEditorChoice = useCallback(
		(choice, start) => {
			if ('open' === editorChoiceMode) {
				void chooseEditorForOpen(choice);
				return;
			}
			chooseEditorAndCreate(choice, start);
		},
		[editorChoiceMode, chooseEditorForOpen, chooseEditorAndCreate]
	);

	return (
		<div className="modula-content-page" ref={listingRef} tabIndex={-1}>
			<AdminUiRoot className="modula-content-page__chrome">
				<ContentPageHeader
					actions={createActions}
					onNewGallery={openCreateEditorChoice}
					onNewAlbum={openCreateAlbumEditorChoice}
					onAlbumUpsell={() => selectSection('albums')}
					notificationsIcon={config.notificationsIconUrl}
				/>
				<ContentSectionTabs
					sections={sections}
					current={shownSection}
					onSelect={selectSection}
				/>
				{upsellSection ? (
					<ContentSectionUpsell
						section={upsellSection}
						imagesUrl={config.sectionImagesUrl}
						upgradeUrl={config.upgradeUrl}
					/>
				) : (
					<div className="modula-content-page__list">
						{proExpiredCount > 0 ? (
							<LicenseExpiredBanner
								variant="page"
								licenseState={config.licenseState}
								count={proExpiredCount}
								renewHref={licenseRenewHref(config.upgradeUrl)}
								className="modula-content-page__license-banner"
							/>
						) : null}
						{selectionNotice ? (
							<Notice
								className="modula-content-page__notice"
								onDismiss={() => setSelectionNotice(null)}
							>
								{selectionNotice}
							</Notice>
						) : null}

						{refreshFailure ? (
							<Notice
								className="modula-content-page__notice"
								role="alert"
							>
								<span>
									{__(
										'Changes saved, but the listing could not be refreshed. Refresh the listing to see the saved values.',
										'modula-best-grid-gallery'
									)}
								</span>
								<Button
									variant="secondary"
									disabled={refreshBusy}
									onClick={() =>
										refreshSavedListing(
											refreshFailure.item,
											refreshFailure.saved
										)
									}
								>
									{__(
										'Refresh listing',
										'modula-best-grid-gallery'
									)}
								</Button>
							</Notice>
						) : null}
						{isError && !refreshFailure ? (
							<p
								className="modula-content-page__error"
								role="alert"
							>
								{error?.message ||
									__(
										'Could not load galleries.',
										'modula-best-grid-gallery'
									)}
							</p>
						) : null}

						{viewReady &&
						!isLoading &&
						!isError &&
						rows.length === 0 &&
						showCreateOnlyEmptyState ? (
							<div className="modula-content-page__empty">
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
								<div className="modula-content-page__empty-actions">
									{config.postNewUrl ? (
										<Button
											variant="primary"
											onClick={openCreateEditorChoice}
										>
											{__(
												'New gallery',
												'modula-best-grid-gallery'
											)}
										</Button>
									) : null}
									{config.canCreateAlbum &&
									config.newAlbumUrl ? (
										<Button
											variant="secondary"
											onClick={
												openCreateAlbumEditorChoice
											}
										>
											{__(
												'New album',
												'modula-best-grid-gallery'
											)}
										</Button>
									) : null}
								</div>
							</div>
						) : (
							<>
								<ListingToolbar
									view={view}
									onChangeView={handleChangeView}
									segmentCounts={data?.segmentCounts || null}
									statusCounts={statusCounts}
									selection={selection}
									pageRows={rows}
									canUseApplyPreset={config.canUseApplyPreset}
									onApplyPreset={
										config.canUseApplyPreset
											? rowActionHandlers.applyListingPreset
											: undefined
									}
									onConvertToNewEditor={
										rowActionHandlers.convertListingGalleries
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
									onSelectionCleared={clearSelection}
								/>
								{activeSearch ? (
									<ListingSearchSummary
										view={view}
										total={pagination.total}
										onChangeView={handleChangeView}
									/>
								) : null}
								<div className="modula-content-page__table">
									<Table
										label={__(
											'Content',
											'modula-best-grid-gallery'
										)}
										columns={tableColumns}
										rows={rows}
										getRowId={(item) =>
											listingSelectionItemId(item) || ''
										}
										selection={{
											selectedIds: selection,
											onChange: handleChangeSelection,
											selectAllLabel: __(
												'Select all',
												'modula-best-grid-gallery'
											),
											rowLabel: (item) =>
												sprintf(
													/* translators: %s: gallery or album title. */
													__(
														'Select %s',
														'modula-best-grid-gallery'
													),
													decodeListingTitle(
														item.title
													)
												),
											isSelectable:
												isListingRowSelectable,
										}}
										expandedRowId={listingQuickEditItemKey(
											quickEditItem
										)}
										renderExpansion={() => (
											<ListingQuickEditPanel
												key={listingQuickEditItemKey(
													quickEditItem
												)}
												item={quickEditItem}
												onCancel={cancelQuickEdit}
												onSave={(document) =>
													saveQuickEdit(
														quickEditItem,
														document
													)
												}
											/>
										)}
										onExpansionClose={cancelQuickEdit}
										loading={!viewReady || isLoading}
										emptyMessage={getListingEmptyMessage({
											segment: getListingSegment(view),
											search: activeSearch,
											noun: rowNoun(2),
										})}
									/>
								</div>
								<Pagination
									total={pagination.total}
									page={view.page}
									perPage={view.perPage}
									noun={rowNoun}
									onPageChange={(page) =>
										handleChangeView({
											...viewRef.current,
											page,
										})
									}
									onPerPageChange={(perPage) =>
										handleChangeView({
											...viewRef.current,
											perPage,
										})
									}
								/>
							</>
						)}
					</div>
				)}
				<ListingSelectAllChooserDialog
					options={selectAllChooserOptions}
					onChoose={chooseSelectAll}
					onCancel={cancelSelectAllChooser}
				/>
				<Toast
					message={toastMessage}
					onDismiss={() => setToastMessage('')}
				/>
			</AdminUiRoot>
			<EditorChoiceModal
				isOpen={editorChoiceMode !== null}
				mode={editorChoiceMode === 'open' ? 'open' : 'create'}
				heroUrl={config.editorChoiceHeroUrl}
				presetOptions={
					'create' === editorChoiceMode ? createPresetOptions : null
				}
				settingsUrl={config.settingsUrl}
				onClose={dismissEditorChoice}
				onChoose={handleEditorChoice}
			/>
		</div>
	);
}
