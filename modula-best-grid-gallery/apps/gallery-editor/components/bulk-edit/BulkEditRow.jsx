import {
	modulaImagesRowIndexForPreviewWrite,
} from 'gallery-shared/preview';
import { useCallback, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import {
	Button,
	CheckboxControl,
	TextControl,
	__experimentalConfirmDialog as ConfirmDialog,
} from '@wordpress/components';
import { FiltersTokenField } from 'shared-ui';
import { trash } from '@wordpress/icons';
import WpClassicCaptionEditor from '../field/WpClassicCaptionEditor';
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
	parseFiltersField,
} from './bulkEditUtils';
import { getModulaAiSettingsAdminUrl } from '../../utils/galleryAdminUrls';
import { galleryRemoveImageByIndex } from '../../api/galleryUploadApi';
import { removePreviewItemAtStoreIndex } from '../../utils/previewItemsCommit';
import { getModulaSettingsEditorConfig } from '../../config/modulaSettingsEditorConfig';
import {
	getBoundGalleryRemoveCopy,
	getBoundGallerySummaryFromEditor,
} from '../../utils/boundGalleryChromePolicy';

function SparkleIcon() {
	return (
		<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
			<path
				fillRule="evenodd"
				d="M0.666656 4.34121V3.69182L1.01511 3.66015C2.37724 3.53344 3.29589 2.5356 3.43843 0.999239L3.47011 0.666626H4.18285L4.21453 0.999239C4.35708 2.5356 5.27573 3.53344 6.6537 3.66015L6.98631 3.69182V4.34121L6.6537 4.35705C5.32324 4.42041 4.37292 5.44992 4.21453 7.0338L4.18285 7.36641H3.47011L3.43843 7.0338C3.28005 5.44992 2.34556 4.42041 1.01511 4.35705L0.666656 4.34121ZM5.13318 9.53632V8.76022L7.76241 8.15835C8.80776 7.92077 8.99783 7.63567 9.17205 6.55863L9.72641 3.12163H10.7401L11.2944 6.55863C11.4687 7.63567 11.6587 7.92077 12.6883 8.15835L15.3333 8.76022V9.53632L12.6883 10.154C11.6587 10.3916 11.5003 10.6767 11.2944 11.7537L10.7401 15.3333H9.72641L9.17205 11.7537C8.99783 10.6767 8.80776 10.3916 7.76241 10.154L5.13318 9.53632ZM1.14182 11.7379V11.4686C2.04463 11.1202 2.58314 10.5658 2.97911 9.53632H3.18501C3.59682 10.5658 4.15118 11.136 5.03815 11.4686V11.7379C4.15118 12.0864 3.58098 12.5615 3.18501 13.7019H2.97911C2.58314 12.5615 2.04463 12.0864 1.14182 11.7379Z"
			/>
		</svg>
	);
}

/**
 * @param {Object}              props
 * @param {Object}              props.row
 * @param {number}              props.storeIndex
 * @param {boolean}             props.selected
 * @param {boolean}             props.isModified
 * @param {(v: boolean) => void} props.onToggleSelected
 * @param {boolean}             props.showFiltersColumn
 * @param {string[]}            props.filterSuggestions
 * @param {boolean}             props.aiConfigured
 * @param {(rowOrId: Object|string, patch: Record<string, unknown>) => void} props.patchRow
 * @param {(row: Object, field: string) => unknown} props.getRowField
 * @param {number}              props.galleryId
 * @param {import('@reduxjs/toolkit').Store} props.previewStore
 * @param {() => Promise<void>} props.runPersistTask
 * @param {(msg: string) => void} props.onNotice
 * @param {(rowOrId: Object|string) => void} props.onRowSaved
 * @param {boolean}             props.isDescriptionExpanded
 * @param {() => void}          props.onExpandDescription
 * @param {() => void}          props.onCollapseDescription
 */
export default function BulkEditRow({
	row,
	storeIndex,
	selected,
	isModified,
	onToggleSelected,
	showFiltersColumn,
	filterSuggestions,
	aiConfigured,
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
	const rowRef = useRef(null);
	const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
	const rowKey = bulkEditRowKey(row);
	const attachmentId = bulkEditNumericAttachmentId(row);
	const canUseAi = attachmentId > 0;
	const editorKey = `${storeIndex}-${rowKey}`;
	const thumb = bulkEditThumbUrl(row);
	const filename = bulkEditFilename(row);

	const title =
		getRowField(row, 'title') !== undefined &&
		getRowField(row, 'title') !== null
			? String(getRowField(row, 'title'))
			: '';
	const alt =
		getRowField(row, 'alt') !== undefined &&
		getRowField(row, 'alt') !== null
			? String(getRowField(row, 'alt'))
			: '';
	const descriptionHtml = bulkEditDescriptionHtml(row, getRowField);
	const descriptionPreview =
		captionToPlainString(descriptionHtml).trim() ||
		__('No description', 'modula-best-grid-gallery');
	const hasDescription = Boolean(
		captionToPlainString(descriptionHtml).trim()
	);

	const filtersValue = parseFiltersField(getRowField(row, 'filters'));

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
		await runPersistTask(async () => {
			await galleryRemoveImageByIndex(galleryId, restRowIndex);
			removePreviewItemAtStoreIndex(previewStore, storeIndex);
		});
		onNotice(__('Image removed.', 'modula-best-grid-gallery'), 'success');
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

	const deleteRow = useCallback(() => {
		setConfirmDeleteOpen(true);
	}, []);

	const rowBusy = aiAltMutation.isPending || aiTitleMutation.isPending;

	const renderAiIcon = (kind) => {
		if (!canUseAi) {
			return null;
		}
		const isTitle = kind === 'title';
		const mutation = isTitle ? aiTitleMutation : aiAltMutation;
		const onClick = isTitle ? handleGenerateTitle : handleGenerateAlt;
		const label = isTitle
			? __('Generate title', 'modula-best-grid-gallery')
			: __('Generate alt text', 'modula-best-grid-gallery');

		return (
			<Button
				icon={<SparkleIcon />}
				label={
					aiConfigured
						? label
						: __('Configure AI', 'modula-best-grid-gallery')
				}
				showTooltip
				size="small"
				variant="tertiary"
				className="modula-bulk-edit__ai-btn"
				isBusy={mutation.isPending}
				disabled={rowBusy}
				onClick={aiConfigured ? onClick : handleAiSettings}
			/>
		);
	};

	const entryClassName = [
		'modula-bulk-edit__entry',
		selected ? 'is-selected' : '',
		isModified ? 'is-modified' : '',
		isDescriptionExpanded ? 'is-description-expanded' : '',
	]
		.filter(Boolean)
		.join(' ');

	return (
		<>
			<div className={entryClassName}>
				<div className="modula-bulk-edit__row" ref={rowRef}>
					<div className="modula-bulk-edit__col modula-bulk-edit__col--check">
						<CheckboxControl
							checked={selected}
							__nextHasNoMarginBottom
							onChange={onToggleSelected}
						/>
					</div>

					<div className="modula-bulk-edit__col modula-bulk-edit__col--thumb">
						<div className="modula-bulk-edit__media">
							<div
								className="modula-bulk-edit__thumb"
								style={
									thumb
										? { backgroundImage: `url(${thumb})` }
										: undefined
								}
							/>
							{filename ? (
								<span
									className="modula-bulk-edit__filename"
									title={filename}
								>
									{filename}
								</span>
							) : null}
						</div>
					</div>

					<div className="modula-bulk-edit__col modula-bulk-edit__col--title">
						<div className="modula-bulk-edit__field-with-action">
							<TextControl
								__nextHasNoMarginBottom
								label={__('Title', 'modula-best-grid-gallery')}
								hideLabelFromVision
								value={title}
								placeholder={__(
									'Add title…',
									'modula-best-grid-gallery'
								)}
								onChange={(value) =>
									patchRow(rowKey, { title: value })
								}
							/>
							<div className="modula-bulk-edit__field-action">
								{renderAiIcon('title')}
							</div>
						</div>
					</div>

					<div className="modula-bulk-edit__col modula-bulk-edit__col--alt">
						<div className="modula-bulk-edit__field-with-action">
							<TextControl
								__nextHasNoMarginBottom
								label={__(
									'Alt text',
									'modula-best-grid-gallery'
								)}
								hideLabelFromVision
								value={alt}
								placeholder={__(
									'Add alt text…',
									'modula-best-grid-gallery'
								)}
								onChange={(value) =>
									patchRow(rowKey, { alt: value })
								}
							/>
							<div className="modula-bulk-edit__field-action">
								{renderAiIcon('alt')}
							</div>
						</div>
					</div>

					<div
						className={[
							'modula-bulk-edit__col',
							'modula-bulk-edit__col--description',
							isDescriptionExpanded
								? 'modula-bulk-edit__col--description-expanded'
								: '',
						]
							.filter(Boolean)
							.join(' ')}
					>
						{isDescriptionExpanded ? (
							<div className="modula-bulk-edit__desc-inline">
								<WpClassicCaptionEditor
									editorInstanceKey={`bulk-desc-${editorKey}`}
									value={descriptionHtml}
									onChange={(value) =>
										patchRow(rowKey, {
											description: value,
										})
									}
									disabled={false}
									accessibleLabel={__(
										'Caption',
										'modula-best-grid-gallery'
									)}
									className="modula-bulk-edit__desc-inline-textarea"
									rows={3}
									tinymceOptions={
										BULK_EDIT_DESCRIPTION_TINYMCE
									}
									autoFocusOnInit
									onEscape={onCollapseDescription}
								/>
							</div>
						) : (
							<div className="modula-bulk-edit__desc-cell">
								<button
									type="button"
									className="modula-bulk-edit__desc-trigger"
									onClick={(event) => {
										event.preventDefault();
										event.stopPropagation();
										onExpandDescription();
									}}
									aria-expanded={false}
								>
									<span
										className={[
											'modula-bulk-edit__desc-trigger-text',
											hasDescription ? '' : 'is-empty',
										]
											.filter(Boolean)
											.join(' ')}
									>
										{descriptionPreview}
									</span>
								</button>
								<Button
									variant="link"
									className="modula-bulk-edit__desc-edit-link"
									onClick={onExpandDescription}
								>
									{__('Edit', 'modula-best-grid-gallery')}
								</Button>
							</div>
						)}
					</div>

					{showFiltersColumn ? (
						<div className="modula-bulk-edit__col modula-bulk-edit__col--filters">
							<FiltersTokenField
								className="modula-bulk-edit__filters-input"
								suggestions={filterSuggestions}
								value={filtersValue}
								onChange={(tokens) =>
									patchRow(rowKey, { filters: tokens })
								}
								placeholder={__(
									'Filter name',
									'modula-best-grid-gallery'
								)}
								addLabel={__(
									'+ Add',
									'modula-best-grid-gallery'
								)}
							/>
						</div>
					) : null}

					<div className="modula-bulk-edit__col modula-bulk-edit__col--actions">
						<Button
							icon={trash}
							label={
								getBoundGalleryRemoveCopy(
									getBoundGallerySummaryFromEditor(
										getModulaSettingsEditorConfig()
									),
									{ isSourceImage: true }
								).actionLabel
							}
							showTooltip
							size="small"
							variant="tertiary"
							className="modula-bulk-edit__delete-btn"
							onClick={deleteRow}
						/>
					</div>
				</div>
			</div>
			<ConfirmDialog
				isOpen={confirmDeleteOpen}
				onConfirm={() => {
					setConfirmDeleteOpen(false);
					void performDeleteRow();
				}}
				onCancel={() => setConfirmDeleteOpen(false)}
			>
				{
					getBoundGalleryRemoveCopy(
						getBoundGallerySummaryFromEditor(
							getModulaSettingsEditorConfig()
						),
						{ isSourceImage: true }
					).confirmBody
				}
			</ConfirmDialog>
		</>
	);
}
