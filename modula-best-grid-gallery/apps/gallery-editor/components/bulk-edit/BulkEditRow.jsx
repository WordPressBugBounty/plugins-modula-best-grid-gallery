import { modulaImagesRowIndexForPreviewWrite } from 'gallery-shared/preview';
import { useCallback, useId, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { Button, Checkbox, ConfirmDialog, TextInput } from 'admin-ui';
import WpClassicCaptionEditor from '../field/WpClassicCaptionEditor';
import FilterChipsEditor from '../field/FilterChipsEditor';
import ItemHoverPresetSelect from '../hover-effect-builder/ItemHoverPresetSelect';
import {
	ITEM_CSS_CLASS_KEY,
	ITEM_HOVER_PRESET_KEY,
} from '../../utils/galleryItemFields';
import { captionToPlainString } from '../../utils/captionToPlainString';
import { BULK_EDIT_DESCRIPTION_TINYMCE } from './bulkEditDescriptionEditor';
import { useModulaAiGenerateAltMutation } from '../../query/useModulaAiGenerateAltMutation';
import { useModulaAiGenerateTitleMutation } from '../../query/useModulaAiGenerateTitleMutation';
import {
	bulkEditDescriptionHtml,
	bulkEditFilename,
	bulkEditNumericAttachmentId,
	bulkEditRowKey,
	bulkEditThumbUrl,
} from './bulkEditUtils';
import { getModulaAiSettingsAdminUrl } from '../../utils/galleryAdminUrls';
import { galleryRemoveImageByIndex } from '../../api/galleryUploadApi';
import { removePreviewItemAtStoreIndex } from '../../utils/previewItemsCommit';

function SparkleIcon() {
	return (
		<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
			<path
				fill="currentColor"
				fillRule="evenodd"
				d="M0.666656 4.34121V3.69182L1.01511 3.66015C2.37724 3.53344 3.29589 2.5356 3.43843 0.999239L3.47011 0.666626H4.18285L4.21453 0.999239C4.35708 2.5356 5.27573 3.53344 6.6537 3.66015L6.98631 3.69182V4.34121L6.6537 4.35705C5.32324 4.42041 4.37292 5.44992 4.21453 7.0338L4.18285 7.36641H3.47011L3.43843 7.0338C3.28005 5.44992 2.34556 4.42041 1.01511 4.35705L0.666656 4.34121ZM5.13318 9.53632V8.76022L7.76241 8.15835C8.80776 7.92077 8.99783 7.63567 9.17205 6.55863L9.72641 3.12163H10.7401L11.2944 6.55863C11.4687 7.63567 11.6587 7.92077 12.6883 8.15835L15.3333 8.76022V9.53632L12.6883 10.154C11.6587 10.3916 11.5003 10.6767 11.2944 11.7537L10.7401 15.3333H9.72641L9.17205 11.7537C8.99783 10.6767 8.80776 10.3916 7.76241 10.154L5.13318 9.53632ZM1.14182 11.7379V11.4686C2.04463 11.1202 2.58314 10.5658 2.97911 9.53632H3.18501C3.59682 10.5658 4.15118 11.136 5.03815 11.4686V11.7379C4.15118 12.0864 3.58098 12.5615 3.18501 13.7019H2.97911C2.58314 12.5615 2.04463 12.0864 1.14182 11.7379Z"
			/>
		</svg>
	);
}

function TrashIcon() {
	return (
		<svg
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.7"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
		</svg>
	);
}

/**
 * @param {unknown} value
 * @return {string} Text field value; missing values are empty.
 */
function textValue(value) {
	return value === undefined || value === null ? '' : String(value);
}

/**
 * Copy for the row's remove button and its confirm (canvas), or the hide
 * copy for a bound gallery.
 *
 * @param {string} name   The image's title, file name or "this image".
 * @param {boolean} isHide
 * @return {{ action: string, title: string, message: string, confirmLabel: string }} Button name and ConfirmDialog copy.
 */
function rowRemoveCopy(name, isHide) {
	if (isHide) {
		return {
			action: sprintf(
				/* translators: %s: image title */
				__('Hide %s from this gallery', 'modula-best-grid-gallery'),
				name
			),
			title: sprintf(
				/* translators: %s: image title */
				__('Hide “%s”?', 'modula-best-grid-gallery'),
				name
			),
			message: __(
				'Hidden images stay in their source gallery.',
				'modula-best-grid-gallery'
			),
			confirmLabel: __('Hide', 'modula-best-grid-gallery'),
		};
	}
	return {
		action: sprintf(
			/* translators: %s: image title */
			__('Remove %s from gallery', 'modula-best-grid-gallery'),
			name
		),
		title: sprintf(
			/* translators: %s: image title */
			__('Delete “%s”?', 'modula-best-grid-gallery'),
			name
		),
		message: __(
			'It will be removed from this gallery. The file stays in your Media Library.',
			'modula-best-grid-gallery'
		),
		confirmLabel: __('Delete', 'modula-best-grid-gallery'),
	};
}

/**
 * @param {Object}                                                           props
 * @param {Object}                                                           props.row
 * @param {number}                                                           props.storeIndex
 * @param {boolean}                                                          props.selected
 * @param {boolean}                                                          props.isModified
 * @param {(v: boolean) => void}                                             props.onToggleSelected
 * @param {boolean}                                                          props.showFiltersColumn
 * @param {boolean}                                                          props.showCssClassColumn
 * @param {boolean}                                                          props.isHide             Bound gallery: the row hides the image instead of removing it.
 * @param {boolean}                                                          props.aiConfigured
 * @param {boolean}                                                          [props.unavailableOnLocalhost]
 * @param {(rowOrId: Object|string, patch: Record<string, unknown>) => void} props.patchRow
 * @param {(row: Object, field: string) => unknown}                          props.getRowField
 * @param {number}                                                           props.galleryId
 * @param {import('@reduxjs/toolkit').Store}                                 props.previewStore
 * @param {Function}                                                         props.runPersistTask
 * @param {(message: string, tone?: string) => void}                         props.onNotice
 * @param {(rowOrId: Object|string) => void}                                 props.onRowSaved
 * @param {boolean}                                                          props.isDescriptionExpanded
 * @param {() => void}                                                       props.onExpandDescription
 * @param {() => void}                                                       props.onCollapseDescription
 */
export default function BulkEditRow({
	row,
	storeIndex,
	selected,
	isModified,
	onToggleSelected,
	showFiltersColumn,
	showCssClassColumn,
	isHide,
	aiConfigured,
	unavailableOnLocalhost = false,
	patchRow,
	getRowField,
	galleryId,
	previewStore,
	runPersistTask,
	onNotice,
	onRowSaved,
	isDescriptionExpanded,
	onExpandDescription,
	onCollapseDescription,
}) {
	const baseId = `modula-bulk-edit-${useId()}`;
	const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
	const [isAddingFilter, setIsAddingFilter] = useState(false);
	const rowKey = bulkEditRowKey(row);
	const attachmentId = bulkEditNumericAttachmentId(row);
	const canUseAi = attachmentId > 0;
	const editorKey = `${storeIndex}-${rowKey}`;
	const thumb = bulkEditThumbUrl(row);

	const title = textValue(getRowField(row, 'title'));
	const alt = textValue(getRowField(row, 'alt'));
	const descriptionHtml = bulkEditDescriptionHtml(row, getRowField);
	const descriptionText = captionToPlainString(descriptionHtml).trim();
	const imageName =
		title ||
		bulkEditFilename(row) ||
		__('this image', 'modula-best-grid-gallery');
	const removeCopy = rowRemoveCopy(imageName, isHide);

	const aiAltMutation = useModulaAiGenerateAltMutation();
	const aiTitleMutation = useModulaAiGenerateTitleMutation();

	const handleAiSettings = useCallback(() => {
		const url = getModulaAiSettingsAdminUrl();
		if (url) {
			window.location.href = url;
		}
	}, []);

	const applyAiResult = useCallback(
		(data) => {
			if (data?.failed) {
				return;
			}
			if (data?.altText) {
				patchRow(rowKey, { alt: data.altText });
			}
			if (data?.title) {
				patchRow(rowKey, { title: data.title });
			}
		},
		[patchRow, rowKey]
	);

	const handleGenerateAlt = useCallback(() => {
		if (!canUseAi) {
			return;
		}
		aiAltMutation.mutate(attachmentId, {
			onSuccess: applyAiResult,
		});
	}, [aiAltMutation, attachmentId, applyAiResult, canUseAi]);

	const handleGenerateTitle = useCallback(() => {
		if (!canUseAi) {
			return;
		}
		aiTitleMutation.mutate(
			{ attachmentId, action: 'generate' },
			{ onSuccess: applyAiResult }
		);
	}, [aiTitleMutation, attachmentId, applyAiResult, canUseAi]);

	const performDeleteRow = useCallback(async () => {
		const itemsLive = previewStore.getState().items.items;
		const restRowIndex = modulaImagesRowIndexForPreviewWrite(
			itemsLive,
			storeIndex
		);
		if (restRowIndex < 0) {
			return;
		}
		try {
			await runPersistTask(async () => {
				await galleryRemoveImageByIndex(galleryId, restRowIndex);
				removePreviewItemAtStoreIndex(previewStore, storeIndex);
			}, `item-remove:${galleryId}:${rowKey}`);
		} catch (err) {
			onNotice(
				err?.message ||
					__(
						'Could not remove the image.',
						'modula-best-grid-gallery'
					),
				'error'
			);
			return;
		}
		onNotice(__('Image removed.', 'modula-best-grid-gallery'));
		onRowSaved(rowKey);
	}, [
		galleryId,
		onNotice,
		onRowSaved,
		previewStore,
		rowKey,
		runPersistTask,
		storeIndex,
	]);

	const rowBusy = aiAltMutation.isPending || aiTitleMutation.isPending;

	const renderAiButton = (kind) => {
		if (!canUseAi || unavailableOnLocalhost) {
			return null;
		}
		const isTitle = kind === 'title';
		const onClick = isTitle ? handleGenerateTitle : handleGenerateAlt;
		const generateLabel = isTitle
			? __('Generate title', 'modula-best-grid-gallery')
			: __('Generate alt text', 'modula-best-grid-gallery');
		const label = aiConfigured
			? generateLabel
			: __('Configure AI', 'modula-best-grid-gallery');

		return (
			<Button
				variant="ghost"
				icon={<SparkleIcon />}
				aria-label={label}
				title={label}
				className="modula-bulk-edit__ai-btn"
				disabled={rowBusy}
				onClick={aiConfigured ? onClick : handleAiSettings}
			/>
		);
	};

	const rowClassName = [
		'modula-bulk-edit__row',
		selected ? 'is-selected' : '',
		isModified ? 'is-modified' : '',
	]
		.filter(Boolean)
		.join(' ');

	return (
		<div className={rowClassName}>
			<Checkbox
				checked={selected}
				aria-label={sprintf(
					/* translators: %s: image title */
					__('Select %s', 'modula-best-grid-gallery'),
					imageName
				)}
				onChange={onToggleSelected}
			/>

			{thumb ? (
				<img className="modula-bulk-edit__thumb" src={thumb} alt="" />
			) : (
				<span className="modula-bulk-edit__thumb" />
			)}

			<div className="modula-bulk-edit__field">
				<TextInput
					aria-label={__('Title', 'modula-best-grid-gallery')}
					value={title}
					placeholder={__('Add title…', 'modula-best-grid-gallery')}
					onChange={(value) => patchRow(rowKey, { title: value })}
				/>
				{renderAiButton('title')}
			</div>

			<div className="modula-bulk-edit__field">
				<TextInput
					aria-label={__('Alt text', 'modula-best-grid-gallery')}
					value={alt}
					placeholder={__(
						'Add alt text…',
						'modula-best-grid-gallery'
					)}
					onChange={(value) => patchRow(rowKey, { alt: value })}
				/>
				{renderAiButton('alt')}
			</div>

			{/* TinyMCE is heavy, so only the caption being edited mounts it. */}
			<div className="modula-bulk-edit__caption">
				{isDescriptionExpanded ? (
					<WpClassicCaptionEditor
						editorInstanceKey={`bulk-desc-${editorKey}`}
						value={descriptionHtml}
						onChange={(value) =>
							patchRow(rowKey, { description: value })
						}
						disabled={false}
						accessibleLabel={__(
							'Caption',
							'modula-best-grid-gallery'
						)}
						className="modula-bulk-edit__caption-editor"
						rows={3}
						tinymceOptions={BULK_EDIT_DESCRIPTION_TINYMCE}
						autoFocusOnInit
						onEscape={onCollapseDescription}
					/>
				) : (
					<button
						type="button"
						className={[
							'modula-bulk-edit__caption-preview',
							descriptionText ? '' : 'is-empty',
						]
							.filter(Boolean)
							.join(' ')}
						aria-label={sprintf(
							/* translators: %s: image title */
							__(
								'Edit caption of %s',
								'modula-best-grid-gallery'
							),
							imageName
						)}
						onClick={onExpandDescription}
					>
						{descriptionText ||
							__('No caption', 'modula-best-grid-gallery')}
					</button>
				)}
			</div>

			{showFiltersColumn ? (
				<div className="modula-bulk-edit__filters">
					<FilterChipsEditor
						value={getRowField(row, 'filters')}
						onChange={(value) =>
							patchRow(rowKey, { filters: value })
						}
						searchId={`${baseId}-filters`}
						isAdding={isAddingFilter}
						onAddingChange={setIsAddingFilter}
					/>
				</div>
			) : null}

			<ItemHoverPresetSelect
				id={`${baseId}-hover`}
				label={sprintf(
					/* translators: %s: image title */
					__('Hover effect for %s', 'modula-best-grid-gallery'),
					imageName
				)}
				className="modula-bulk-edit__hover"
				value={textValue(getRowField(row, ITEM_HOVER_PRESET_KEY))}
				onChange={(value) =>
					patchRow(rowKey, { [ITEM_HOVER_PRESET_KEY]: value })
				}
			/>

			{showCssClassColumn ? (
				<TextInput
					aria-label={sprintf(
						/* translators: %s: image title */
						__('CSS class for %s', 'modula-best-grid-gallery'),
						imageName
					)}
					className="modula-bulk-edit__css-class"
					spellCheck={false}
					autoComplete="off"
					placeholder="hero-image"
					value={textValue(getRowField(row, ITEM_CSS_CLASS_KEY))}
					onChange={(value) =>
						patchRow(rowKey, { [ITEM_CSS_CLASS_KEY]: value })
					}
				/>
			) : null}

			<Button
				variant="ghost"
				icon={<TrashIcon />}
				aria-label={removeCopy.action}
				title={removeCopy.action}
				className="modula-bulk-edit__remove"
				onClick={() => setConfirmDeleteOpen(true)}
			/>

			<ConfirmDialog
				open={confirmDeleteOpen}
				title={removeCopy.title}
				message={removeCopy.message}
				confirmLabel={removeCopy.confirmLabel}
				onConfirm={() => {
					setConfirmDeleteOpen(false);
					void performDeleteRow();
				}}
				onCancel={() => setConfirmDeleteOpen(false)}
			/>
		</div>
	);
}
