/**
 * Unified gallery item edit modal (images + content blocks).
 */
import {
	asGalleryItemList,
	isGalleryPreviewVideoItem,
	modulaImagesRowIndexForPreviewWrite,
	normalizeGalleryItemLookupString,
	storeIndexToCoreIndex,
} from 'gallery-shared/preview';
import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from '@wordpress/element';
import '../../styles/takeover/preview/_image-metadata-modal.scss';
import GalleryModal from '../gallery-modal/GalleryModal';
import '../../styles/takeover/preview/_content-block-edit.scss';
import { __ } from '@wordpress/i18n';
import { useMutation } from '@tanstack/react-query';
import { useSelector, useStore } from 'react-redux';
import GalleryItemEditModalHeader from './GalleryItemEditModalHeader';
import GalleryItemEditNavUnsavedPopover from './GalleryItemEditNavUnsavedPopover';
import ImageMetadataModalFooter from '../image-metadata-modal/ImageMetadataModalFooter';
import ContentBlockEditContent from './ContentBlockEditContent';
import { useTakeoverSaveStatus } from '../../context/TakeoverSaveStatusContext';
import { usePreviewItemPersist } from '../../context/PreviewItemPersistContext';
import {
	galleryPatchImageByIndex,
	saveMergedGalleryItems,
} from '../../api/galleryUploadApi';
import {
	commitPreviewCatalog,
	mergeModulaRowIntoPreviewItem,
	syncPreviewCoreToStoreAndBootstrap,
} from '../../utils/previewItemsCommit';
import { applyVideoTemplateDisplayFieldsToPreviewItem } from '../../utils/videoTemplateItems';
import { patchBootstrapQueryItems } from '../../utils/patchBootstrapQueryItems';
import {
	defaultImageMetadataValuesFromItem,
	useImageMetadataForm,
} from '../../form/useImageMetadataForm';
import { resolveProGateLock } from '../../logic/proGateLock';
import { useModulaSettingsEditorConfig } from '../../hooks/useModulaSettingsEditorConfig';
import {
	getEditableGalleryItemIndices,
	getGalleryItemEditKind,
} from '../../utils/galleryItemEditNavigation';
import { buildImageMetadataPreviewChips } from '../../utils/imageMetadataPreviewMeta';
import { contentBlockStateToSaveFields } from '../../utils/contentBlockEditState';
import {
	mergeContentBlockSaveFieldsIntoRow,
	previewCoreItemsToSaveMergedPayload,
	reanchorEmbeddedRowsInMergedList,
} from '../../utils/embeddedGalleryItems';
import { useGallerySettingsFormBundle } from '../../form/GallerySettingsFormContext';
import { parseFiltersField } from '../bulk-edit/bulkEditUtils';
import { mergeTagsIntoGalleryFilterSettings } from '../bulk-edit/bulkEditSave';
import { getWpMediaAttachmentQueryKey } from '../../query/useWpMediaAttachmentQuery';
import {
	collectImageMetadataEditValues,
	isContentBlockEditDirty,
	isImageMetadataEditDirty,
	snapshotCaptionFromImageMetadataEditor,
} from '../../utils/galleryItemEditDirtyState';

/**
 * @param {Object}                                      props
 * @param {boolean}                                     props.isOpen
 * @param {() => void}                                  props.onClose
 * @param {number}                                      props.galleryId
 * @param {number|null}                                 props.storeIndex
 * @param {(idx: number) => void}                       props.onNavigate
 * @param {import('@tanstack/react-query').QueryClient} props.queryClient
 * @param {import('@tanstack/react-query').QueryKey}    props.bootstrapQueryKey
 */
export default function GalleryItemEditModal({
	isOpen,
	onClose,
	galleryId,
	storeIndex,
	onNavigate,
	queryClient,
	bootstrapQueryKey,
}) {
	const store = useStore();
	const { form: gallerySettingsForm } = useGallerySettingsFormBundle();
	const { runPersistTask: runSaveBarPersistTask } = useTakeoverSaveStatus();
	const previewItemPersist = usePreviewItemPersist();
	const runPersistTask =
		previewItemPersist?.runPersistTaskWithDeferredRefresh ??
		runSaveBarPersistTask;
	const reduxItems = useSelector((s) => s.items.items);
	const editor = useModulaSettingsEditorConfig();
	const panelRef = useRef(/** @type {HTMLDivElement|null} */ (null));
	const contentBlockHandlersRef = useRef(
		/** @type {{ getSavePayload: () => Object, onReset: () => void } | null} */ (
			null
		)
	);
	const [navPrompt, setNavPrompt] = useState(
		/** @type {{ targetIndex: number, anchorEl: HTMLElement } | null} */ (
			null
		)
	);
	const [navBusy, setNavBusy] = useState(false);
	const [editSessionTick, setEditSessionTick] = useState(0);

	const item = useMemo(() => {
		if (!isOpen || storeIndex === null || storeIndex === undefined) {
			return null;
		}
		return reduxItems[storeIndex] || null;
	}, [isOpen, storeIndex, reduxItems]);

	const itemKind = getGalleryItemEditKind(item);
	const galleryType = useSelector((s) => s.gallery.config?.type);
	const isVideoItem = isGalleryPreviewVideoItem(item, galleryType);
	const isImage = itemKind === 'image';
	const isContentBlock = itemKind === 'content-block';
	const attachmentId = isImage && item?.id ? Number(item.id) : 0;

	const { form, mediaQuery } = useImageMetadataForm(
		isOpen && isImage,
		isImage ? storeIndex : null,
		isImage ? item : null,
		attachmentId
	);

	useEffect(() => {
		setNavPrompt(null);
	}, [storeIndex]);

	useEffect(() => {
		if (!isOpen || !isImage) {
			return undefined;
		}
		return form.store.subscribe(() => {
			setEditSessionTick((tick) => tick + 1);
		});
	}, [form, isImage, isOpen]);

	const focusFirstField = useCallback(() => {
		const root = panelRef.current;
		if (!root) {
			return;
		}
		const firstField = root.querySelector(
			'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled]), .components-button-group-control button:not([disabled])'
		);
		if (firstField instanceof HTMLElement) {
			firstField.focus({ preventScroll: true });
			return;
		}
		root.focus({ preventScroll: true });
	}, []);

	useLayoutEffect(() => {
		if (!isOpen || storeIndex === null || storeIndex === undefined) {
			return undefined;
		}
		focusFirstField();
		return undefined;
	}, [isOpen, storeIndex, itemKind, focusFirstField]);

	const videoGate = resolveProGateLock(
		{ kind: 'requiresExtension', extensionSlug: 'modula-video' },
		editor
	);
	const exifGate = resolveProGateLock(
		{ kind: 'requiresExtension', extensionSlug: 'modula-exif' },
		editor
	);
	const filtersGate = resolveProGateLock({ kind: 'requiresPro' }, editor);

	const buildImagePatchFields = useCallback(() => {
		const captionLive = snapshotCaptionFromImageMetadataEditor(
			`${storeIndex}-${attachmentId}`
		);
		const local = {
			...form.state.values,
			...(captionLive !== undefined ? { description: captionLive } : {}),
		};
		const fields = {
			title: local.title,
			alt: local.alt,
			description: local.description,
			link: local.link,
			target: Number(local.target) || 0,
			halign: local.halign,
			valign: local.valign,
			togglelightbox: Number(local.togglelightbox) || 0,
			hide_title: Number(local.hide_title) || 0,
		};
		if (filtersGate.allowed) {
			fields.filters = local.filters;
			mergeTagsIntoGalleryFilterSettings(
				gallerySettingsForm,
				parseFiltersField(local.filters)
			);
		}
		if (videoGate.allowed) {
			fields.video_url = local.video_url;
			fields.video_thumbnail = local.video_thumbnail;
			fields.autoplay_thumbnail = local.autoplay_thumbnail;
			fields.autoplay_lightbox = local.autoplay_lightbox;
			fields.loop_video = local.loop_video;
		}
		const enableExif = Boolean(
			gallerySettingsForm.state.values?.exif?.enableExif
		);
		if (exifGate.allowed && enableExif) {
			fields.exif_camera = local.exif_camera;
			fields.exif_lens = local.exif_lens;
			fields.exif_focal_length = local.exif_focal_length;
			fields.exif_shutter_speed = local.exif_shutter_speed;
			fields.exif_aperture = local.exif_aperture;
			fields.exif_iso = local.exif_iso;
			fields.exif_date = local.exif_date;
		}
		return { fields, local };
	}, [
		attachmentId,
		exifGate.allowed,
		filtersGate.allowed,
		form.state.values,
		gallerySettingsForm,
		storeIndex,
		videoGate.allowed,
	]);

	const getIsDirty = useCallback(() => {
		if (!item) {
			return false;
		}
		if (isContentBlock) {
			return isContentBlockEditDirty(item, () =>
				contentBlockHandlersRef.current?.getSavePayload?.()
			);
		}
		if (isImage) {
			return isImageMetadataEditDirty(
				item,
				form,
				storeIndex,
				attachmentId
			);
		}
		return false;
	}, [attachmentId, form, isContentBlock, isImage, item, storeIndex]);

	const isDirty = useMemo(() => {
		void editSessionTick;
		return getIsDirty();
	}, [editSessionTick, getIsDirty]);

	const saveMutation = useMutation({
		mutationFn: async () => {
			if (!galleryId || storeIndex === null || storeIndex < 0 || !item) {
				throw new Error('missing_context');
			}

			if (isContentBlock) {
				const payload =
					contentBlockHandlersRef.current?.getSavePayload?.();
				if (!payload) {
					throw new Error('missing_content_block_state');
				}
				const fields = contentBlockStateToSaveFields(payload);
				const eidNorm = normalizeGalleryItemLookupString(
					item.embeddedId || item.id
				);
				if (!eidNorm) {
					throw new Error('missing_embedded_id');
				}
				previewItemPersist?.resetPreviewPersistDirty?.();
				await runPersistTask(async () => {
					const core = asGalleryItemList(
						store.getState().items.items
					);
					const next = core.map((r) =>
						normalizeGalleryItemLookupString(
							r.embeddedId || r.id
						) === eidNorm
							? mergeContentBlockSaveFieldsIntoRow(r, fields)
							: r
					);
					const reanchored = reanchorEmbeddedRowsInMergedList(next);
					await saveMergedGalleryItems(
						galleryId,
						previewCoreItemsToSaveMergedPayload(reanchored)
					);
					commitPreviewCatalog(store, reanchored);
				});
				return null;
			}

			if (!isImage) {
				throw new Error('unsupported_item');
			}

			const { fields } = buildImagePatchFields();
			const itemsLive = store.getState().items.items;
			const displayCoreIndex = storeIndexToCoreIndex(
				itemsLive,
				storeIndex
			);
			const restRowIndex = modulaImagesRowIndexForPreviewWrite(
				itemsLive,
				storeIndex
			);
			if (displayCoreIndex < 0 || restRowIndex < 0) {
				throw new Error('invalid_indices');
			}
			await runPersistTask(async () => {
				const res = await galleryPatchImageByIndex(
					galleryId,
					restRowIndex,
					fields
				);
				const core = asGalleryItemList(
					store.getState().items.items
				);
				const prevItem = core[displayCoreIndex];
				if (!prevItem) {
					return;
				}
				const row = res?.image ?? {};
				const mergedRow = mergeModulaRowIntoPreviewItem(prevItem, {
					...row,
					video_url: row.video_url ?? fields.video_url,
					video_thumbnail:
						row.video_thumbnail ?? fields.video_thumbnail,
				});
				core[displayCoreIndex] =
					applyVideoTemplateDisplayFieldsToPreviewItem(mergedRow, {
						video_url: mergedRow.video_url ?? fields.video_url,
						video_thumbnail:
							mergedRow.video_thumbnail ?? fields.video_thumbnail,
					});
				syncPreviewCoreToStoreAndBootstrap(
					store,
					queryClient,
					galleryId,
					core
				);
			});
			return {
				savedImageValues: collectImageMetadataEditValues(
					form,
					storeIndex,
					attachmentId
				),
			};
		},
		onSuccess: async (result) => {
			if (isImage) {
				if (attachmentId > 0) {
					await queryClient.invalidateQueries({
						queryKey: getWpMediaAttachmentQueryKey(attachmentId),
					});
				}
				const core = asGalleryItemList(
					store.getState().items.items
				);
				patchBootstrapQueryItems(queryClient, galleryId, core);
				// Video bootstrap rows are server-processed (poster vs .mp4 src); refetch
				// so preview matches persisted meta without waiting for window focus.
				if (bootstrapQueryKey && isVideoItem) {
					await queryClient.refetchQueries({
						queryKey: bootstrapQueryKey,
					});
				}
				if (result?.savedImageValues) {
					form.reset(result.savedImageValues);
				}
			}
		},
		onError: (e) => {
			// eslint-disable-next-line no-console
			console.error(e);
		},
	});

	const editableIndices = useMemo(
		() => getEditableGalleryItemIndices(reduxItems),
		[reduxItems]
	);

	const posInList = editableIndices.indexOf(storeIndex);
	const hasPrev = posInList > 0;
	const hasNext = posInList >= 0 && posInList < editableIndices.length - 1;

	const attemptNavigate = useCallback(
		(targetIndex, anchorEl) => {
			if (targetIndex === null || targetIndex === undefined) {
				return;
			}
			if (getIsDirty()) {
				setNavPrompt({ targetIndex, anchorEl });
				return;
			}
			setNavPrompt(null);
			onNavigate(targetIndex);
		},
		[getIsDirty, onNavigate]
	);

	const handleRequestPrevious = useCallback(
		(anchorEl) => {
			if (posInList <= 0) {
				return;
			}
			attemptNavigate(editableIndices[posInList - 1], anchorEl);
		},
		[attemptNavigate, editableIndices, posInList]
	);

	const handleRequestNext = useCallback(
		(anchorEl) => {
			if (posInList < 0 || posInList >= editableIndices.length - 1) {
				return;
			}
			attemptNavigate(editableIndices[posInList + 1], anchorEl);
		},
		[attemptNavigate, editableIndices, posInList]
	);

	const discardUnsavedChanges = useCallback(() => {
		if (!item) {
			return;
		}
		if (isImage) {
			form.reset(defaultImageMetadataValuesFromItem(item));
		}
		if (isContentBlock) {
			contentBlockHandlersRef.current?.onReset?.();
		}
	}, [form, isContentBlock, isImage, item]);

	const handleSaveAndContinue = useCallback(async () => {
		if (!navPrompt || navBusy) {
			return;
		}
		const { targetIndex } = navPrompt;
		setNavBusy(true);
		try {
			await saveMutation.mutateAsync();
			setNavPrompt(null);
			onNavigate(targetIndex);
		} finally {
			setNavBusy(false);
		}
	}, [navBusy, navPrompt, onNavigate, saveMutation]);

	const handleContinueWithoutSaving = useCallback(() => {
		if (!navPrompt) {
			return;
		}
		const { targetIndex } = navPrompt;
		discardUnsavedChanges();
		setNavPrompt(null);
		onNavigate(targetIndex);
	}, [discardUnsavedChanges, navPrompt, onNavigate]);

	if (
		!isOpen ||
		storeIndex === null ||
		storeIndex === undefined ||
		typeof document === 'undefined'
	) {
		return null;
	}

	if (!itemKind) {
		return null;
	}

	const mediaBusy = Boolean(isImage && mediaQuery.isFetching);
	const previewChips = isImage
		? buildImageMetadataPreviewChips(item, mediaQuery.data)
		: { filename: '' };

	const headerMetaPrimary = isContentBlock
		? __('Content block', 'modula-best-grid-gallery')
		: previewChips.filename;
	const headerMetaId = isContentBlock
		? item?.embeddedId || item?.id || ''
		: attachmentId;

	const onSave = () => {
		if (!galleryId || storeIndex === null || storeIndex < 0 || !item) {
			return;
		}
		saveMutation.mutate();
	};

	const onSaveAndClose = async () => {
		if (!galleryId || storeIndex === null || storeIndex < 0 || !item) {
			return;
		}
		if (getIsDirty()) {
			try {
				await saveMutation.mutateAsync();
			} catch {
				return;
			}
		}
		onClose();
	};

	const onReset = () => {
		if (!item) {
			return;
		}
		if (isImage) {
			form.reset(defaultImageMetadataValuesFromItem(item));
			return;
		}
		if (isContentBlock) {
			contentBlockHandlersRef.current?.onReset?.();
		}
	};

	return (
		<>
			<GalleryModal
				isOpen
				onClose={onClose}
				size="large"
				className="modula-image-metadata-modal"
				panelClassName="modula-image-metadata-modal__panel"
				titleId="modula-image-metadata-modal-title"
				panelRef={panelRef}
				bodyOverflow="hidden"
				header={
					<GalleryItemEditModalHeader
						itemKind={itemKind}
						isVideoItem={isVideoItem}
						metaPrimary={headerMetaPrimary}
						metaId={headerMetaId}
						hasPrev={hasPrev}
						hasNext={hasNext}
						onRequestPrevious={handleRequestPrevious}
						onRequestNext={handleRequestNext}
						onClose={onClose}
					/>
				}
				footer={
					<ImageMetadataModalFooter
						canReset={Boolean(item)}
						saveBusy={saveMutation.isPending || navBusy}
						disabled={mediaBusy || !item}
						isDirty={isDirty}
						onReset={onReset}
						onCancel={onClose}
						onSave={onSave}
						onSaveAndClose={() => void onSaveAndClose()}
					/>
				}
			>
				{isContentBlock ? (
					<ContentBlockEditContent
						item={item}
						storeIndex={storeIndex}
						disabled={saveMutation.isPending}
						handlersRef={contentBlockHandlersRef}
						onStateChange={() =>
							setEditSessionTick((tick) => tick + 1)
						}
					/>
				) : null}
			</GalleryModal>
			<GalleryItemEditNavUnsavedPopover
				anchorEl={navPrompt?.anchorEl ?? null}
				onClose={() => setNavPrompt(null)}
				onSaveAndContinue={handleSaveAndContinue}
				onContinueWithoutSaving={handleContinueWithoutSaving}
				busy={navBusy || saveMutation.isPending}
			/>
		</>
	);
}
