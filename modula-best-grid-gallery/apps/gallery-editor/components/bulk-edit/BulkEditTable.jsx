import { useMemo, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Checkbox } from 'admin-ui';
import BulkEditRow from './BulkEditRow';
import { isEmbeddedGalleryItemRow } from '../../utils/embeddedGalleryItems';
import { bulkEditRowKey, getBulkEditSourceItems } from './bulkEditUtils';
import { bulkEditRowIsModified } from './bulkEditSave';

/**
 * Column widths from the canvas: check, image, title, alt text, caption,
 * filters, hover effect, CSS class, then the row's remove button.
 *
 * @param {{ filters: boolean, cssClass: boolean }} columns Optional columns shown.
 * @return {string} `grid-template-columns` for the head and every row.
 */
function bulkEditGridColumns(columns) {
	return [
		'28px 64px minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1.6fr)',
		columns.filters ? '240px' : '',
		'200px',
		columns.cssClass ? '190px' : '',
		'36px',
	]
		.filter(Boolean)
		.join(' ');
}

/**
 * @param {Object}                                       props
 * @param {Object[]}                                     props.rows
 * @param {boolean}                                      props.showFiltersColumn
 * @param {boolean}                                      props.showCssClassColumn
 * @param {boolean}                                      props.isHide             Bound gallery: rows hide images instead of removing them.
 * @param {boolean}                                      props.aiConfigured
 * @param {boolean}                                      [props.unavailableOnLocalhost]
 * @param {string[]}                                     props.selectedIds
 * @param {ReturnType<typeof import('./useBulkEditDraft').useBulkEditDraft>} props.draft
 * @param {number}                                       props.galleryId
 * @param {import('@reduxjs/toolkit').Store}             props.previewStore
 * @param {Function}                                     props.runPersistTask
 * @param {(message: string, tone?: string) => void}     props.onNotice
 */
export default function BulkEditTable({
	rows,
	showFiltersColumn,
	showCssClassColumn,
	isHide,
	aiConfigured,
	unavailableOnLocalhost = false,
	selectedIds,
	draft,
	galleryId,
	previewStore,
	runPersistTask,
	onNotice,
}) {
	const [expandedDescriptionKey, setExpandedDescriptionKey] = useState(
		/** @type {string|null} */ (null)
	);
	const rowKeys = useMemo(
		() => rows.map((r) => bulkEditRowKey(r)).filter(Boolean),
		[rows]
	);

	const allSelected =
		rowKeys.length > 0 && rowKeys.every((id) => selectedIds.includes(id));
	const gridStyle = {
		'--modula-bulk-edit-columns': bulkEditGridColumns({
			filters: showFiltersColumn,
			cssClass: showCssClassColumn,
		}),
	};

	return (
		<div className="modula-bulk-edit" style={gridStyle}>
			<div className="modula-bulk-edit__head">
				<Checkbox
					checked={allSelected}
					aria-label={__('Select all', 'modula-best-grid-gallery')}
					onChange={(checked) =>
						draft.toggleAllSelected(rowKeys, checked)
					}
				/>
				<span>{__('Image', 'modula-best-grid-gallery')}</span>
				<span>{__('Title', 'modula-best-grid-gallery')}</span>
				<span>{__('Alt text', 'modula-best-grid-gallery')}</span>
				<span>{__('Caption', 'modula-best-grid-gallery')}</span>
				{showFiltersColumn ? (
					<span>{__('Filters', 'modula-best-grid-gallery')}</span>
				) : null}
				<span>{__('Hover effect', 'modula-best-grid-gallery')}</span>
				{showCssClassColumn ? (
					<span>{__('CSS class', 'modula-best-grid-gallery')}</span>
				) : null}
				<span />
			</div>

			<div className="modula-bulk-edit__body">
				{rows.map((row) => {
					const key = bulkEditRowKey(row);
					const storeIndex = row.__storeIndex;
					const editorKey = `${storeIndex}-${key}`;
					return (
						<BulkEditRow
							key={editorKey}
							row={row}
							storeIndex={storeIndex}
							selected={selectedIds.includes(key)}
							isModified={bulkEditRowIsModified(
								row,
								draft.localChanges
							)}
							onToggleSelected={(checked) =>
								draft.toggleSelected(key, checked)
							}
							showFiltersColumn={showFiltersColumn}
							showCssClassColumn={showCssClassColumn}
							isHide={isHide}
							aiConfigured={aiConfigured}
							unavailableOnLocalhost={unavailableOnLocalhost}
							patchRow={draft.patchRow}
							getRowField={draft.getRowField}
							galleryId={galleryId}
							previewStore={previewStore}
							runPersistTask={runPersistTask}
							onNotice={onNotice}
							onRowSaved={(id) => draft.clearRowDraft(id)}
							isDescriptionExpanded={
								expandedDescriptionKey === editorKey
							}
							onExpandDescription={() =>
								setExpandedDescriptionKey(editorKey)
							}
							onCollapseDescription={() =>
								setExpandedDescriptionKey(null)
							}
						/>
					);
				})}
			</div>
		</div>
	);
}

/**
 * Build rows with store indices for REST patch helpers.
 *
 * @param {import('@reduxjs/toolkit').Store|null} previewStore
 * @return {Object[]}
 */
export function buildBulkEditRowsWithIndices(previewStore) {
	const items = getBulkEditSourceItems(previewStore);
	/** @type {Object[]} */
	const out = [];
	items.forEach((row, storeIndex) => {
		if (row && !isEmbeddedGalleryItemRow(row) && row.id) {
			out.push({ ...row, __storeIndex: storeIndex });
		}
	});
	return out;
}
