import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from '@wordpress/element';
import '../../styles/takeover/preview/_bulk-edit.scss';
import { __, _n, sprintf } from '@wordpress/i18n';
import {
	Button,
	ConfirmDialog,
	Dialog,
	Menu,
	MenuItem,
	Notice,
	Toast,
} from 'admin-ui';
import { AdminUiScope, useTakeoverSaveStatus } from 'editor-shell';
import { useBulkEdit } from '../../context/BulkEditContext';
import { useGalleryPreviewTileSelection } from '../../context/GalleryPreviewTileSelectionContext';
import { usePreviewReduxStoreItems } from '../../hooks/usePreviewReduxStoreItems';
import { useGallerySettingsFormBundle } from '../../form/GallerySettingsFormContext';
import { useInvalidateGalleryBootstrap } from '../../hooks/useInvalidateGalleryBootstrap';
import { useModulaAiDescriptorSettingsQuery } from '../../query/useModulaAiDescriptorSettingsQuery';
import { useModulaSettingsEditorConfig } from '../../hooks/useModulaSettingsEditorConfig';
import {
	getBoundGalleryRemoveCopy,
	getBoundGallerySummaryFromEditor,
} from '../../utils/boundGalleryChromePolicy';
import { getGalleryPreviewReduxStore } from '../../utils/previewReduxStoreRef';
import { useWatermarkRegistration } from '../../hooks/useWatermarkRegistration';
import WatermarkActionButtonSlot from '../field/WatermarkActionButtonSlot';
import BulkEditFilterActions from './BulkEditFilterActions';
import {
	bulkEditTickedRows,
	bulkEditWatermarkTargetIds,
	filterBulkEditRowsByStoreIndices,
	hasBulkEditFiltersColumn,
	hasBulkEditWatermarkAction,
} from './bulkEditUtils';
import { useBulkEditDraft } from './useBulkEditDraft';
import { persistBulkEditDraft, bulkEditRowIsModified } from './bulkEditSave';
import BulkEditTable, { buildBulkEditRowsWithIndices } from './BulkEditTable';

const NO_TOAST = { message: '', tone: 'success' };

/**
 * The watermark actions on the selection (Pro's watermark action button).
 *
 * @return {{ action: 'apply_watermark'|'remove_watermark', label: string }[]} Rows; `label` takes the image count.
 */
function bulkEditWatermarkActions() {
	return [
		{
			action: 'apply_watermark',
			/* translators: %d: number of images */
			label: __('Apply watermark (%d)', 'modula-best-grid-gallery'),
		},
		{
			action: 'remove_watermark',
			/* translators: %d: number of images */
			label: __('Remove watermark (%d)', 'modula-best-grid-gallery'),
		},
	];
}

/**
 * @param {string} postTitle
 * @param {number} galleryId
 * @return {string} Dialog title, "Bulk edit · Slider 3.0" in the canvas.
 */
function bulkEditTitle(postTitle, galleryId) {
	if (postTitle) {
		return sprintf(
			/* translators: %s: gallery title */
			__('Bulk edit · %s', 'modula-best-grid-gallery'),
			postTitle
		);
	}
	if (galleryId) {
		return sprintf(
			/* translators: %d: gallery id */
			__('Bulk edit · Gallery #%d', 'modula-best-grid-gallery'),
			galleryId
		);
	}
	return __('Bulk edit', 'modula-best-grid-gallery');
}

/**
 * @param {number} imageCount
 * @param {number} modifiedCount
 * @return {string} "1 image · 0 modified".
 */
function bulkEditCountLabel(imageCount, modifiedCount) {
	return sprintf(
		/* translators: 1: "3 images", 2: number of modified images */
		__('%1$s · %2$d modified', 'modula-best-grid-gallery'),
		sprintf(
			/* translators: %d: number of images */
			_n('%d image', '%d images', imageCount, 'modula-best-grid-gallery'),
			imageCount
		),
		modifiedCount
	);
}

/**
 * The confirm before "Delete selected": canvas copy, or the hide copy for a
 * bound gallery, whose images stay in their source gallery.
 *
 * @param {number}  count
 * @param {boolean} isHide
 * @return {{ title: string, message: string, confirmLabel: string }} ConfirmDialog copy.
 */
function deleteSelectedConfirmCopy(count, isHide) {
	if (isHide) {
		return {
			title: sprintf(
				/* translators: %d: number of images */
				_n(
					'Hide %d image?',
					'Hide %d images?',
					count,
					'modula-best-grid-gallery'
				),
				count
			),
			message: __(
				'Hidden images stay in their source gallery.',
				'modula-best-grid-gallery'
			),
			confirmLabel: __('Hide', 'modula-best-grid-gallery'),
		};
	}
	return {
		title: sprintf(
			/* translators: %d: number of images */
			_n(
				'Delete %d image?',
				'Delete %d images?',
				count,
				'modula-best-grid-gallery'
			),
			count
		),
		message: _n(
			'It will be removed from this gallery. The file stays in your Media Library.',
			'They will be removed from this gallery. The files stay in your Media Library.',
			count,
			'modula-best-grid-gallery'
		),
		confirmLabel: __('Delete', 'modula-best-grid-gallery'),
	};
}

function ChevronDownIcon() {
	return (
		<svg
			width="12"
			height="12"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.7"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<path d="M6 9l6 6 6-6" />
		</svg>
	);
}

/**
 * The header's Columns menu: the optional CSS class column (canvas).
 *
 * @param {Object}                   props
 * @param {boolean}                  props.showCssClass
 * @param {(show: boolean) => void}  props.onShowCssClassChange
 */
function BulkEditColumnsMenu({ showCssClass, onShowCssClassChange }) {
	const [open, setOpen] = useState(false);
	const label = __('Columns', 'modula-best-grid-gallery');
	return (
		<Menu
			open={open}
			onOpenChange={setOpen}
			label={label}
			align="end"
			trigger={(triggerProps) => (
				<Button {...triggerProps} className="modula-bulk-edit__columns">
					{label}
					<ChevronDownIcon />
				</Button>
			)}
		>
			<MenuItem
				toggle
				checked={showCssClass}
				onSelect={() => onShowCssClassChange(!showCssClass)}
			>
				{__('CSS class', 'modula-best-grid-gallery')}
			</MenuItem>
		</Menu>
	);
}

/**
 * Bulk metadata editor for the takeover preview (canvas "Bulk edit"): an
 * admin-ui Dialog with one row per image, a footer to save or delete, and a
 * toast for results while it is open.
 */
export default function BulkEditModal() {
	const config = useModulaSettingsEditorConfig();
	const hideCopy = getBoundGalleryRemoveCopy(
		getBoundGallerySummaryFromEditor(config),
		{ isSourceImage: true }
	);
	const { isOpen, closeBulkEdit } = useBulkEdit();
	const galleryId = config.galleryId ? Number(config.galleryId) : 0;
	const postTitle = config.postTitle || '';
	const { form } = useGallerySettingsFormBundle();
	const { runPersistTask } = useTakeoverSaveStatus();
	const invalidateBootstrap = useInvalidateGalleryBootstrap(galleryId);
	const [toast, setToast] = useState(NO_TOAST);
	const [busy, setBusy] = useState(false);
	const [showCssClassColumn, setShowCssClassColumn] = useState(false);
	const [confirmKind, setConfirmKind] = useState(
		/** @type {'discard'|'discard-close'|'delete'|null} */ (null)
	);
	const previewStore = getGalleryPreviewReduxStore();
	const reduxItems = usePreviewReduxStoreItems(isOpen);
	const draft = useBulkEditDraft(previewStore, reduxItems);
	const tileSelection = useGalleryPreviewTileSelection();
	const tileSelectionRef = useRef(tileSelection);
	tileSelectionRef.current = tileSelection;
	const [scopeStoreIndices, setScopeStoreIndices] = useState(
		/** @type {number[]|null} */ (null)
	);

	useEffect(() => {
		if (!isOpen) {
			setScopeStoreIndices(null);
			return;
		}
		const selected = tileSelectionRef.current?.selectedStoreIndices ?? [];
		setScopeStoreIndices(selected.length > 0 ? [...selected] : null);
	}, [isOpen]);

	const rows = useMemo(() => {
		if (!isOpen || !previewStore) {
			return [];
		}
		return filterBulkEditRowsByStoreIndices(
			buildBulkEditRowsWithIndices(previewStore),
			scopeStoreIndices
		);
	}, [previewStore, reduxItems, isOpen, scopeStoreIndices]);

	const modifiedCount = useMemo(
		() =>
			rows.filter((row) => bulkEditRowIsModified(row, draft.localChanges))
				.length,
		[rows, draft.localChanges]
	);

	const tickedRows = useMemo(
		() => bulkEditTickedRows(rows, draft.selectedIds),
		[rows, draft.selectedIds]
	);

	const watermarkRegistration = useWatermarkRegistration();
	const watermarkTargetIds = useMemo(
		() => bulkEditWatermarkTargetIds(rows, draft.selectedIds),
		[rows, draft.selectedIds]
	);

	const aiSettingsQuery = useModulaAiDescriptorSettingsQuery({
		enabled: isOpen,
	});

	const showToast = useCallback((message, tone = 'success') => {
		setToast({ message, tone });
	}, []);

	const dismissToast = useCallback(() => setToast(NO_TOAST), []);

	const close = useCallback(() => {
		setToast(NO_TOAST);
		closeBulkEdit();
	}, [closeBulkEdit]);

	const requestClose = useCallback(() => {
		if (draft.hasChanges) {
			setConfirmKind('discard-close');
			return;
		}
		close();
	}, [close, draft.hasChanges]);

	const handleDiscardDraft = useCallback(() => {
		if (!draft.hasChanges) {
			return;
		}
		setConfirmKind('discard');
	}, [draft.hasChanges]);

	const confirmDiscard = useCallback(() => {
		const closeAfter = confirmKind === 'discard-close';
		setConfirmKind(null);
		draft.resetDraft();
		if (closeAfter) {
			close();
			return;
		}
		showToast(__('Unsaved changes discarded.', 'modula-best-grid-gallery'));
	}, [close, confirmKind, draft, showToast]);

	const handleSaveAll = useCallback(async () => {
		if (!galleryId || !previewStore) {
			return;
		}
		if (!draft.hasChanges) {
			close();
			return;
		}
		setBusy(true);
		try {
			await runPersistTask(async () => {
				await persistBulkEditDraft({
					galleryId,
					store: previewStore,
					localChanges: draft.localChanges,
					form,
				});
			}, 'bulk-edit');
			invalidateBootstrap();
			draft.resetDraft();
			close();
		} catch (err) {
			showToast(
				err?.message ||
					__(
						'Could not save bulk edits.',
						'modula-best-grid-gallery'
					),
				'error'
			);
		} finally {
			setBusy(false);
		}
	}, [
		close,
		draft,
		form,
		galleryId,
		invalidateBootstrap,
		previewStore,
		runPersistTask,
		showToast,
	]);

	const performDeleteSelected = useCallback(async () => {
		if (!galleryId || !previewStore || draft.selectedCount === 0) {
			return;
		}
		setBusy(true);
		try {
			const exclude = new Set(draft.selectedIds);
			await runPersistTask(async () => {
				await persistBulkEditDraft({
					galleryId,
					store: previewStore,
					localChanges: draft.localChanges,
					form,
					excludeAttachmentIds: exclude,
				});
			}, 'bulk-remove');
			invalidateBootstrap();
			draft.resetDraft();
			showToast(
				hideCopy.isHide
					? __(
							'Selected images hidden from this gallery.',
							'modula-best-grid-gallery'
						)
					: __('Selected images deleted.', 'modula-best-grid-gallery')
			);
		} catch (err) {
			showToast(
				err?.message ||
					__(
						'Could not delete selected images.',
						'modula-best-grid-gallery'
					),
				'error'
			);
		} finally {
			setBusy(false);
		}
	}, [
		draft,
		form,
		galleryId,
		hideCopy.isHide,
		invalidateBootstrap,
		previewStore,
		runPersistTask,
		showToast,
	]);

	const handleDeleteSelected = useCallback(() => {
		if (!galleryId || !previewStore || draft.selectedCount === 0) {
			return;
		}
		setConfirmKind('delete');
	}, [draft.selectedCount, galleryId, previewStore]);

	if (!isOpen) {
		return null;
	}

	const showFiltersColumn = hasBulkEditFiltersColumn(config);
	const aiConfigured = Boolean(aiSettingsQuery.data?.aiConfigured);
	const unavailableOnLocalhost = Boolean(
		aiSettingsQuery.data?.unavailableOnLocalhost
	);
	const showWatermarkAction = hasBulkEditWatermarkAction(
		config,
		watermarkRegistration
	);
	const deleteCopy = deleteSelectedConfirmCopy(
		draft.selectedCount,
		hideCopy.isHide
	);

	return (
		<AdminUiScope>
			<Dialog
				open
				onClose={requestClose}
				title={bulkEditTitle(postTitle, galleryId)}
				subtitle={bulkEditCountLabel(rows.length, modifiedCount)}
				headerActions={
					<BulkEditColumnsMenu
						showCssClass={showCssClassColumn}
						onShowCssClassChange={setShowCssClassColumn}
					/>
				}
				className="modula-bulk-edit-modal"
				closeDisabled={busy}
			>
				{unavailableOnLocalhost ? (
					<Notice tone="warning" className="modula-bulk-edit__notice">
						{__(
							'AI unavailable on localhost',
							'modula-best-grid-gallery'
						)}
					</Notice>
				) : null}

				{!previewStore ? (
					<p className="modula-bulk-edit__empty">
						{__(
							'Preview is still loading…',
							'modula-best-grid-gallery'
						)}
					</p>
				) : null}
				{previewStore && rows.length === 0 ? (
					<div className="modula-bulk-edit__empty">
						<p className="modula-bulk-edit__empty-title">
							{__(
								'No images in this gallery',
								'modula-best-grid-gallery'
							)}
						</p>
						<p>
							{__(
								'Add images in the preview, then open bulk edit again.',
								'modula-best-grid-gallery'
							)}
						</p>
					</div>
				) : null}
				{previewStore && rows.length > 0 ? (
					<BulkEditTable
						rows={rows}
						showFiltersColumn={showFiltersColumn}
						showCssClassColumn={showCssClassColumn}
						isHide={hideCopy.isHide}
						aiConfigured={aiConfigured}
						unavailableOnLocalhost={unavailableOnLocalhost}
						selectedIds={draft.selectedIds}
						draft={draft}
						galleryId={galleryId}
						previewStore={previewStore}
						runPersistTask={runPersistTask}
						onNotice={showToast}
					/>
				) : null}

				<div className="modula-bulk-edit__footer">
					<Button
						variant="link"
						onClick={handleDiscardDraft}
						disabled={busy || !draft.hasChanges}
					>
						{__('Discard changes', 'modula-best-grid-gallery')}
					</Button>
					<div className="modula-bulk-edit__footer-actions">
						{showFiltersColumn ? (
							<BulkEditFilterActions
								tickedRows={tickedRows}
								getRowField={draft.getRowField}
								patchRow={draft.patchRow}
								busy={busy}
							/>
						) : null}
						{showWatermarkAction
							? bulkEditWatermarkActions().map(
									({ action, label }) => (
										<WatermarkActionButtonSlot
											key={action}
											action={action}
											buttonLabel={sprintf(
												label,
												watermarkTargetIds.length
											)}
											disabled={
												busy ||
												watermarkTargetIds.length === 0
											}
											imageIds={watermarkTargetIds}
										/>
									)
								)
							: null}
						<Button
							onClick={handleDeleteSelected}
							disabled={busy || draft.selectedCount === 0}
						>
							{sprintf(
								/* translators: %d: number of selected images */
								__(
									'Delete selected (%d)',
									'modula-best-grid-gallery'
								),
								draft.selectedCount
							)}
						</Button>
						<Button
							variant="primary"
							onClick={handleSaveAll}
							disabled={busy || !draft.hasChanges}
						>
							{__(
								'Save all and close',
								'modula-best-grid-gallery'
							)}
						</Button>
					</div>
				</div>

				<ConfirmDialog
					open={
						confirmKind === 'discard' ||
						confirmKind === 'discard-close'
					}
					title={__('Discard changes?', 'modula-best-grid-gallery')}
					message={__(
						'Your unsaved edits in Bulk edit will be lost.',
						'modula-best-grid-gallery'
					)}
					confirmLabel={__('Discard', 'modula-best-grid-gallery')}
					onConfirm={confirmDiscard}
					onCancel={() => setConfirmKind(null)}
				/>
				<ConfirmDialog
					open={confirmKind === 'delete'}
					title={deleteCopy.title}
					message={deleteCopy.message}
					confirmLabel={deleteCopy.confirmLabel}
					onConfirm={() => {
						setConfirmKind(null);
						void performDeleteSelected();
					}}
					onCancel={() => setConfirmKind(null)}
				/>
				<Toast
					message={toast.message}
					tone={toast.tone}
					onDismiss={dismissToast}
				/>
			</Dialog>
		</AdminUiScope>
	);
}
