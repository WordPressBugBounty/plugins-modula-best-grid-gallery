/**
 * Image edit panel (canvas "Edit image"): replaces the settings panel in its
 * column. The header pages through the gallery; the cards hold the file, the
 * text, the link, the filters and the hover effect, and "More settings" holds
 * Video, EXIF, Watermark and Advanced. Edits autosave to the item.
 */
import { useCallback, useEffect, useMemo } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { ItemEditCard, ItemEditPanelHeader } from 'editor-shell';
import { isWpTruthy } from '../../logic/wpTruthy';
import { useModulaSettingsEditorConfig } from '../../hooks/useModulaSettingsEditorConfig';
import { usePreviewReduxStoreItems } from '../../hooks/usePreviewReduxStoreItems';
import { useImageMetadataForm } from '../../form/useImageMetadataForm';
import { useGalleryItemMetadataAutosave } from '../../hooks/useGalleryItemMetadataAutosave';
import { useGallerySettingsFormBundle } from '../../form/GallerySettingsFormContext';
import { useGalleryItemEditSidebar } from '../../context/GalleryItemEditSidebarContext';
import { useGalleryPreviewAdminActionsOptional } from '../../hooks/useGalleryPreviewAdminActionsOptional';
import { buildImageMetadataPreviewChips } from '../../utils/imageMetadataPreviewMeta';
import { resolveGalleryAdminPostId } from '../../utils/resolveGalleryAdminPostId';
import FreeformStackingControls from './FreeformStackingControls';
import ImageEditFileCard from './ImageEditFileCard';
import ImageEditFiltersField from './ImageEditFiltersField';
import ImageEditHoverCard from './ImageEditHoverCard';
import ImageEditLinkCard from './ImageEditLinkCard';
import ImageEditMoreSettings from './ImageEditMoreSettings';
import ImageEditTextCard from './ImageEditTextCard';
import { removeAfterFlush, useItemEditPager } from './useItemEditPager';

/**
 * @param {Object|null} item  Redux gallery row.
 * @param {Object|null} media WP media attachment.
 * @return {string} The thumbnail shown in the file card.
 */
function resolveThumbSrc(item, media) {
	return (
		item?.thumbnail ||
		item?.src ||
		item?.url ||
		media?.media_details?.sizes?.thumbnail?.source_url ||
		media?.source_url ||
		''
	);
}

/**
 * @param {Object} props
 * @param {number} props.storeIndex
 */
export default function GalleryItemEditPanel({ storeIndex }) {
	const editor = useModulaSettingsEditorConfig();
	const galleryId = resolveGalleryAdminPostId(editor);
	const itemEdit = useGalleryItemEditSidebar();
	const close = itemEdit?.close;
	const back = itemEdit?.back;
	const adminActions = useGalleryPreviewAdminActionsOptional();
	const reduxItems = usePreviewReduxStoreItems(true);
	const { form: gallerySettingsForm } = useGallerySettingsFormBundle();
	const pager = useItemEditPager(
		reduxItems,
		storeIndex,
		__('Image', 'modula-best-grid-gallery')
	);

	const item = reduxItems[storeIndex] || null;
	const attachmentId = item?.id ? Number(item.id) : 0;

	const { form, mediaQuery } = useImageMetadataForm(
		Boolean(item),
		storeIndex,
		item,
		attachmentId
	);
	const media = mediaQuery.data;

	const { filtersGate, videoGate, exifGate, flush } =
		useGalleryItemMetadataAutosave({
			galleryId,
			storeIndex,
			attachmentId,
			item,
			form,
			enabled: Boolean(item && galleryId),
		});

	useEffect(() => {
		return () => {
			flush();
		};
		// Flush only on unmount / storeIndex change handled by remount key.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [storeIndex]);

	// Back to the settings; the tile stays selected.
	const onBack = useCallback(() => {
		flush();
		back?.();
	}, [back, flush]);

	const onRemove = useMemo(
		() => removeAfterFlush(flush, storeIndex, adminActions),
		[adminActions, flush, storeIndex]
	);

	const chips = useMemo(
		() => buildImageMetadataPreviewChips(item, media),
		[item, media]
	);

	if (!item) {
		return (
			<div className="modula-settings-panel modula-gallery-item-edit-panel">
				<ItemEditPanelHeader
					title={__('Image', 'modula-best-grid-gallery')}
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

	const values = gallerySettingsForm.state.values;
	const galleryType = values?.general?.type || values?.type || '';
	const watermarkApplied = isWpTruthy(item.watermarkApplied);

	return (
		<div className="modula-settings-panel modula-gallery-item-edit-panel">
			<ItemEditPanelHeader {...pager} onBack={onBack} />
			<div className="modula-settings-panel__scroll modula-gallery-item-edit-panel__scroll">
				<ImageEditFileCard
					storeIndex={storeIndex}
					item={item}
					reduxItems={reduxItems}
					galleryType={galleryType}
					thumbSrc={resolveThumbSrc(item, media)}
					fileName={
						chips.filename ||
						__('Image', 'modula-best-grid-gallery')
					}
					meta={[chips.dimensions, chips.fileSize]
						.filter(Boolean)
						.join(' · ')}
					onRemove={onRemove}
				/>
				<FreeformStackingControls storeIndex={storeIndex} />
				<ImageEditTextCard
					form={form}
					storeIndex={storeIndex}
					attachmentId={attachmentId}
				/>
				<ImageEditLinkCard form={form} />
				{filtersGate.allowed ? (
					<ItemEditCard>
						<form.Field name="filters">
							{(field) => (
								<ImageEditFiltersField
									value={field.state.value ?? ''}
									onChange={(v) => field.handleChange(v)}
								/>
							)}
						</form.Field>
					</ItemEditCard>
				) : null}
				<ImageEditHoverCard form={form} />
				<ImageEditMoreSettings
					form={form}
					attachmentId={attachmentId}
					showVideo={videoGate.allowed}
					showExif={
						exifGate.allowed && Boolean(values?.exif?.enableExif)
					}
					showWatermark={Boolean(editor.isPro) || watermarkApplied}
					watermarkApplied={watermarkApplied}
				/>
			</div>
		</div>
	);
}
