import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from '@wordpress/element';
import '../../styles/takeover/preview/_bulk-edit.scss';
import { __, sprintf } from '@wordpress/i18n';
import {
	Button,
	ButtonGroup,
	Notice,
	Placeholder,
	Spinner,
	__experimentalConfirmDialog as ConfirmDialog,
} from '@wordpress/components';
import { useBulkEdit } from '../../context/BulkEditContext';
import { useGalleryPreviewTileSelection } from '../../context/GalleryPreviewTileSelectionContext';
import { usePreviewReduxStoreItems } from '../../hooks/usePreviewReduxStoreItems';
import { useTakeoverSaveStatus } from '../../context/TakeoverSaveStatusContext';
import { useGallerySettingsFormBundle } from '../../form/GallerySettingsFormContext';
import { useInvalidateGalleryBootstrap } from '../../hooks/useInvalidateGalleryBootstrap';
import { useModulaAiDescriptorSettingsQuery } from '../../query/useModulaAiDescriptorSettingsQuery';
import { useModulaSettingsEditorConfig } from '../../hooks/useModulaSettingsEditorConfig';
import {
	getBoundGalleryRemoveCopy,
	getBoundGallerySummaryFromEditor,
} from '../../utils/boundGalleryChromePolicy';
import { getGalleryPreviewReduxStore } from '../../utils/previewReduxStoreRef';
import GalleryModal from '../gallery-modal/GalleryModal';
import {
	filterBulkEditRowsByStoreIndices,
	galleryFilterSuggestions,
	hasBulkEditFiltersColumn,
} from './bulkEditUtils';
import { useBulkEditDraft } from './useBulkEditDraft';
import { persistBulkEditDraft, bulkEditRowIsModified } from './bulkEditSave';
import BulkEditTable, { buildBulkEditRowsWithIndices } from './BulkEditTable';

/**
 * Fullscreen bulk metadata editor for takeover preview.
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
	const [notices, setNotices] = useState(
		/** @type {{ id: string, status: string, text: string }[]} */ ([])
	);
	const [busy, setBusy] = useState(false);
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

	const showFiltersColumn = hasBulkEditFiltersColumn(config);
	const filterSuggestions = useMemo(
		() => galleryFilterSuggestions(form.state.values?.filters?.filters),
		[form.state.values?.filters?.filters]
	);

	const aiSettingsQuery = useModulaAiDescriptorSettingsQuery({
		enabled: isOpen,
	});
	const aiConfigured = Boolean(aiSettingsQuery.data);

	const addNotice = useCallback((text, status = 'info') => {
		const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
		setNotices((prev) => [...prev, { id, status, text }]);
	}, []);

	const dismissNotice = useCallback((id) => {
		setNotices((prev) => prev.filter((n) => n.id !== id));
	}, []);

	const finishDiscardDraft = useCallback(() => {
		draft.resetDraft();
		setNotices([]);
	}, [draft]);

	const requestClose = useCallback(() => {
		if (draft.hasChanges) {
			setConfirmKind('discard-close');
			return;
		}
		closeBulkEdit();
	}, [closeBulkEdit, draft.hasChanges]);

	const handleDiscardDraft = useCallback(() => {
		if (!draft.hasChanges) {
			return;
		}
		setConfirmKind('discard');
	}, [draft.hasChanges]);

	const handleSaveAll = useCallback(async () => {
		if (!galleryId || !previewStore) {
			return;
		}
		if (!draft.hasChanges) {
			closeBulkEdit();
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
			});
			invalidateBootstrap();
			draft.resetDraft();
			addNotice(
				__('All changes saved.', 'modula-best-grid-gallery'),
				'success'
			);
			closeBulkEdit();
		} catch (err) {
			addNotice(
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
		addNotice,
		closeBulkEdit,
		draft,
		form,
		galleryId,
		invalidateBootstrap,
		previewStore,
		runPersistTask,
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
			});
			invalidateBootstrap();
			draft.resetDraft();
			addNotice(
				hideCopy.isHide
					? __(
							'Selected images hidden from this gallery.',
							'modula-best-grid-gallery'
						)
					: __('Selected images deleted.', 'modula-best-grid-gallery'),
				'success'
			);
		} catch (err) {
			addNotice(
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
		addNotice,
		draft,
		form,
		galleryId,
		hideCopy.isHide,
		invalidateBootstrap,
		previewStore,
		runPersistTask,
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

	const title = postTitle
		? sprintf(
				/* translators: %s: gallery title */
				__('Bulk edit: %s', 'modula-best-grid-gallery'),
				postTitle
			)
		: galleryId
			? sprintf(
					/* translators: %d: gallery id */
					__('Bulk edit: Gallery #%d', 'modula-best-grid-gallery'),
					galleryId
				)
			: __('Bulk edit gallery', 'modula-best-grid-gallery');

	const subtitle = sprintf(
		/* translators: 1: image count, 2: modified count */
		__('%1$d images • %2$d modified', 'modula-best-grid-gallery'),
		rows.length,
		modifiedCount
	);

	return (
		<>
			<GalleryModal
				isOpen
				onClose={requestClose}
				size="xlarge"
				title={title}
				subtitle={subtitle}
				titleId="modula-bulk-edit-modal-title"
				className="modula-bulk-edit-modal"
				panelClassName="modula-bulk-edit-modal__panel"
				bodyClassName="modula-bulk-edit-modal__body"
				bodyOverflow="hidden"
				closeOnBackdropClick={false}
				footerLeft={
					<Button
						variant="link"
						className="modula-gallery-modal__footer-link"
						onClick={handleDiscardDraft}
						disabled={busy || !draft.hasChanges}
					>
						{__('Discard changes', 'modula-best-grid-gallery')}
					</Button>
				}
				footerRight={
					<ButtonGroup>
						<Button
							variant="secondary"
							className="modula-gallery-modal__footer-destructive"
							isDestructive
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
							className="modula-gallery-modal__footer-primary"
							onClick={handleSaveAll}
							disabled={busy || !draft.hasChanges}
							isBusy={busy}
						>
							{__(
								'Save all and close',
								'modula-best-grid-gallery'
							)}
						</Button>
					</ButtonGroup>
				}
			>
				{notices.length > 0 ? (
					<div className="modula-bulk-edit-modal__notices">
						{notices.map((n) => (
							<Notice
								key={n.id}
								status={n.status}
								isDismissible
								onRemove={() => dismissNotice(n.id)}
							>
								{n.text}
							</Notice>
						))}
					</div>
				) : null}

				{!previewStore ? (
					<Placeholder>
						<Spinner />
						<p>
							{__(
								'Preview is still loading…',
								'modula-best-grid-gallery'
							)}
						</p>
					</Placeholder>
				) : rows.length === 0 ? (
					<Placeholder
						icon="format-gallery"
						label={__(
							'No images in this gallery',
							'modula-best-grid-gallery'
						)}
						instructions={__(
							'Add images in the preview, then open bulk edit again.',
							'modula-best-grid-gallery'
						)}
					/>
				) : (
					<BulkEditTable
						rows={rows}
						modifiedCount={modifiedCount}
						showFiltersColumn={showFiltersColumn}
						filterSuggestions={filterSuggestions}
						aiConfigured={aiConfigured}
						selectedIds={draft.selectedIds}
						draft={draft}
						galleryId={galleryId}
						previewStore={previewStore}
						runPersistTask={runPersistTask}
						onNotice={addNotice}
						busy={busy}
					/>
				)}
			</GalleryModal>
			<ConfirmDialog
				isOpen={
					confirmKind === 'discard' || confirmKind === 'discard-close'
				}
				onConfirm={() => {
					finishDiscardDraft();
					if (confirmKind === 'discard-close') {
						closeBulkEdit();
					} else {
						addNotice(
							__(
								'Unsaved changes discarded.',
								'modula-best-grid-gallery'
							),
							'info'
						);
					}
					setConfirmKind(null);
				}}
				onCancel={() => setConfirmKind(null)}
			>
				{__('Discard unsaved bulk edits?', 'modula-best-grid-gallery')}
			</ConfirmDialog>
			<ConfirmDialog
				isOpen={confirmKind === 'delete'}
				onConfirm={() => {
					setConfirmKind(null);
					void performDeleteSelected();
				}}
				onCancel={() => setConfirmKind(null)}
			>
				{hideCopy.isHide
					? __(
							'Hide selected images from this gallery?',
							'modula-best-grid-gallery'
						)
					: __(
							'Delete selected images from this gallery?',
							'modula-best-grid-gallery'
						)}
			</ConfirmDialog>
		</>
	);
}
