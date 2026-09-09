/**
 * Content block edit sidebar panel — settings-column takeover (aligned with Image edit).
 */
import {
	isTemplateProtectedEmbeddedRow,
} from 'gallery-shared/preview';
import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { ActionRow, Button } from 'shared-ui';
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
import SettingsPanelHeader from '../sidebar/settings-panel/SettingsPanelHeader';
import SettingsPanelSection from '../sidebar/settings-panel/SettingsPanelSection';

/**
 * @param {Object} props
 * @param {number} props.storeIndex
 */
export default function GalleryItemContentBlockPanel({ storeIndex }) {
	const editor = useModulaSettingsEditorConfig();
	const galleryId = resolveGalleryAdminPostId(editor);
	const { close } = useGalleryItemEditSidebar() || { close: () => {} };
	const adminActions = useGalleryPreviewAdminActionsOptional();
	const { form: gallerySettingsForm } = useGallerySettingsFormBundle();
	const reduxItems = usePreviewReduxStoreItems(true);
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

	const onBack = useCallback(() => {
		void (async () => {
			await flush();
			close();
		})();
	}, [close, flush]);

	const onDeleteBlock = useCallback(() => {
		void (async () => {
			await flush();
			await adminActions?.removeItem?.(storeIndex);
		})();
	}, [adminActions, flush, storeIndex]);

	if (!item || !isContentBlockGalleryItemRow(item)) {
		return (
			<div className="modula-settings-panel modula-gallery-item-edit-panel modula-gallery-item-content-block-panel">
				<SettingsPanelHeader
					title={__('Content block', 'modula-best-grid-gallery')}
					description={__(
						'This tile is no longer in the gallery.',
						'modula-best-grid-gallery'
					)}
					isNested
					parentTitle={__('Gallery', 'modula-best-grid-gallery')}
					onBack={close}
				/>
			</div>
		);
	}

	return (
		<div className="modula-settings-panel modula-gallery-item-edit-panel modula-gallery-item-content-block-panel">
			<SettingsPanelHeader
				title={__('Content block', 'modula-best-grid-gallery')}
				description={__(
					'Headline, body, spacing, and colors for this tile.',
					'modula-best-grid-gallery'
				)}
				isNested
				parentTitle={__('Gallery', 'modula-best-grid-gallery')}
				onBack={onBack}
			/>
			<div className="modula-settings-panel__scroll modula-gallery-item-edit-panel__scroll">
				{CONTENT_BLOCK_MODAL_SECTIONS.map((section) => (
					<SettingsPanelSection
						key={section.name}
						label={section.title}
					>
						<ContentBlockEditSectionContent
							sectionName={section.name}
							state={state}
							setState={setState}
							editorInstanceKey={editorInstanceKey}
							disabled={false}
							hasWpEditor={hasWpEditor}
							hideSectionChrome
						/>
					</SettingsPanelSection>
				))}
				{isTemplateSlot ? null : (
					<SettingsPanelSection
						label={__('Block', 'modula-best-grid-gallery')}
					>
						<ActionRow>
							<Button
								variant="ghost"
								className="modula-gallery-item-edit-panel__danger"
								disabled={!adminActions?.removeItem}
								confirm={__(
									'Confirm deletion?',
									'modula-best-grid-gallery'
								)}
								onClick={onDeleteBlock}
							>
								{__('Delete block', 'modula-best-grid-gallery')}
							</Button>
						</ActionRow>
						<p className="modula-gallery-item-edit-panel__file-help">
							{__(
								'Removes this content block from the gallery. You can add a new one anytime.',
								'modula-best-grid-gallery'
							)}
						</p>
					</SettingsPanelSection>
				)}
			</div>
		</div>
	);
}
