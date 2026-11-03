/**
 * Content block edit panel: the item edit chrome of the Image panel (header
 * with previous/next, cards) over the block's Content, Spacing & font and
 * Colors.
 */
import { isTemplateProtectedEmbeddedRow } from 'gallery-shared/preview';
import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Button } from 'admin-ui';
import { ItemEditCard, ItemEditPanelHeader } from 'editor-shell';
import { useGalleryItemEditSidebar } from '../../context/GalleryItemEditSidebarContext';
import { useGalleryPreviewAdminActionsOptional } from '../../hooks/useGalleryPreviewAdminActionsOptional';
import { useModulaSettingsEditorConfig } from '../../hooks/useModulaSettingsEditorConfig';
import { usePreviewReduxStoreItems } from '../../hooks/usePreviewReduxStoreItems';
import { useGalleryItemContentBlockAutosave } from '../../hooks/useGalleryItemContentBlockAutosave';
import { useGallerySettingsFormBundle } from '../../form/GallerySettingsFormContext';
import { resolveGalleryAdminPostId } from '../../utils/resolveGalleryAdminPostId';
import { isContentBlockGalleryItemRow } from '../../utils/embeddedGalleryItems';
import {
	contentBlockRowStableKey,
	createContentBlockEditInitialState,
} from '../../utils/contentBlockEditState';
import { snapshotCaptionFromImageMetadataEditor } from '../../utils/galleryItemEditDirtyState';
import { CONTENT_BLOCK_MODAL_SECTIONS } from '../../constants/contentBlockModalSections';
import ContentBlockEditSectionContent from '../gallery-item-edit-modal/ContentBlockEditSectionContent';
import FreeformStackingControls from './FreeformStackingControls';
import { removeAfterFlush, useItemEditPager } from './useItemEditPager';

/**
 * @param {Object} props
 * @param {number} props.storeIndex
 */
export default function GalleryItemContentBlockPanel({ storeIndex }) {
	const editor = useModulaSettingsEditorConfig();
	const galleryId = resolveGalleryAdminPostId(editor);
	const itemEdit = useGalleryItemEditSidebar();
	const close = itemEdit?.close;
	const back = itemEdit?.back;
	const adminActions = useGalleryPreviewAdminActionsOptional();
	const { form: gallerySettingsForm } = useGallerySettingsFormBundle();
	const reduxItems = usePreviewReduxStoreItems(true);
	const pager = useItemEditPager(
		reduxItems,
		storeIndex,
		__('Content block', 'modula-best-grid-gallery')
	);
	const item = reduxItems[storeIndex] || null;
	const galleryType =
		gallerySettingsForm.state.values?.general?.type ||
		gallerySettingsForm.state.values?.type ||
		'';
	const isTemplateSlot = isTemplateProtectedEmbeddedRow(item, galleryType);

	const rowKey = useMemo(
		() => `${storeIndex}-${contentBlockRowStableKey(item)}`,
		[storeIndex, item]
	);
	const editorInstanceKey = useMemo(() => `cb-sidebar-${rowKey}`, [rowKey]);

	const [state, setStateInternal] = useState(() =>
		createContentBlockEditInitialState(item || {})
	);
	const [editSessionTick, setEditSessionTick] = useState(0);

	const setState = useCallback((updater) => {
		setStateInternal(updater);
		setEditSessionTick((n) => n + 1);
	}, []);

	/*
	 * Reset only when switching tiles (rowKey). Do not reset on every Redux
	 * item refresh after autosave — that would clobber in-progress edits.
	 */
	useEffect(() => {
		setStateInternal(createContentBlockEditInitialState(item || {}));
		setEditSessionTick(0);
		// eslint-disable-next-line react-hooks/exhaustive-deps -- item snapshot at rowKey change
	}, [rowKey]);

	const hasWpEditor = Boolean(
		typeof window !== 'undefined' && window.wp?.oldEditor?.initialize
	);

	const getSavePayload = useCallback(() => {
		const liveBody = hasWpEditor
			? snapshotCaptionFromImageMetadataEditor(editorInstanceKey)
			: undefined;
		return {
			...state,
			blockBodyHtml:
				liveBody !== undefined ? liveBody : state.blockBodyHtml,
		};
	}, [editorInstanceKey, hasWpEditor, state]);

	const getSavePayloadRef = useRef(getSavePayload);
	getSavePayloadRef.current = getSavePayload;

	const { flush } = useGalleryItemContentBlockAutosave({
		galleryId,
		storeIndex,
		item: isContentBlockGalleryItemRow(item) ? item : null,
		getSavePayload: () => getSavePayloadRef.current(),
		editSessionTick,
		enabled: Boolean(galleryId && isContentBlockGalleryItemRow(item)),
	});

	useEffect(() => {
		return () => {
			void flush();
		};
		// Flush on unmount / storeIndex remount only.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [storeIndex]);

	// Back to the settings; the tile stays selected.
	const onBack = useCallback(() => {
		void (async () => {
			await flush();
			back?.();
		})();
	}, [back, flush]);

	const onRemove = useMemo(
		() => removeAfterFlush(flush, storeIndex, adminActions),
		[adminActions, flush, storeIndex]
	);

	if (!item || !isContentBlockGalleryItemRow(item)) {
		return (
			<div className="modula-settings-panel modula-gallery-item-edit-panel modula-gallery-item-content-block-panel">
				<ItemEditPanelHeader
					title={__('Content block', 'modula-best-grid-gallery')}
					onBack={close}
				/>
				<p className="modula-gallery-item-edit-panel__gone">
					{__(
						'This tile is no longer in the gallery.',
						'modula-best-grid-gallery'
					)}
				</p>
			</div>
		);
	}

	return (
		<div className="modula-settings-panel modula-gallery-item-edit-panel modula-gallery-item-content-block-panel">
			<ItemEditPanelHeader {...pager} onBack={onBack} />
			<div className="modula-settings-panel__scroll modula-gallery-item-edit-panel__scroll">
				<ItemEditCard className="modula-gallery-item-edit-panel__file">
					<div className="modula-gallery-item-edit-panel__file-text">
						<span className="modula-gallery-item-edit-panel__file-name">
							{__('Content block', 'modula-best-grid-gallery')}
						</span>
						<span className="modula-gallery-item-edit-panel__file-meta">
							{__('Text tile', 'modula-best-grid-gallery')}
						</span>
					</div>
					{isTemplateSlot ? null : (
						<Button
							className="modula-gallery-item-edit-panel__remove"
							disabled={!adminActions?.removeItem}
							onClick={onRemove}
						>
							{__('Remove', 'modula-best-grid-gallery')}
						</Button>
					)}
				</ItemEditCard>
				<FreeformStackingControls storeIndex={storeIndex} />
				{CONTENT_BLOCK_MODAL_SECTIONS.map((section) => (
					<ItemEditCard key={section.name} title={section.title}>
						<ContentBlockEditSectionContent
							sectionName={section.name}
							state={state}
							setState={setState}
							editorInstanceKey={editorInstanceKey}
							disabled={false}
							hasWpEditor={hasWpEditor}
						/>
					</ItemEditCard>
				))}
			</div>
		</div>
	);
}
