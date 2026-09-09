import { useMemo, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { CheckboxControl } from '@wordpress/components';
import BulkEditRow from './BulkEditRow';
import { isEmbeddedGalleryItemRow } from '../../utils/embeddedGalleryItems';
import { bulkEditRowKey, getBulkEditSourceItems } from './bulkEditUtils';
import { bulkEditRowIsModified } from './bulkEditSave';

/**
 * @param {Object} props
 */
export default function BulkEditTable({
	rows,
	modifiedCount = 0,
	showFiltersColumn,
	filterSuggestions,
	aiConfigured,
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

	return (
		<div
			className={`modula-bulk-edit${
				showFiltersColumn ? ' modula-bulk-edit--has-filters' : ''
			}`}
		>
			<div className="modula-bulk-edit__subheader">
				<CheckboxControl
					checked={allSelected}
					indeterminate={selectedIds.length > 0 && !allSelected}
					__nextHasNoMarginBottom
					label={__('Select all', 'modula-best-grid-gallery')}
					onChange={(checked) =>
						draft.toggleAllSelected(rowKeys, checked)
					}
				/>
				<p className="modula-bulk-edit__subheader-meta">
					{sprintf(
						/* translators: 1: image count, 2: modified count */
						__(
							'%1$d images • %2$d modified',
							'modula-best-grid-gallery'
						),
						rows.length,
						modifiedCount
					)}
				</p>
			</div>

			<div className="modula-bulk-edit__sheet-host">
				<div className="modula-bulk-edit__sheet">
					<div className="modula-bulk-edit__sheet-scroll">
						<div
							className="modula-bulk-edit__sheet-head"
							role="row"
						>
							<div className="modula-bulk-edit__col modula-bulk-edit__col--check">
								<span className="screen-reader-text">
									{__('Select', 'modula-best-grid-gallery')}
								</span>
							</div>
							<div className="modula-bulk-edit__col modula-bulk-edit__col--thumb">
								{__('Image', 'modula-best-grid-gallery')}
							</div>
							<div className="modula-bulk-edit__col modula-bulk-edit__col--title">
								{__('Title', 'modula-best-grid-gallery')}
							</div>
							<div className="modula-bulk-edit__col modula-bulk-edit__col--alt">
								{__('Alt text', 'modula-best-grid-gallery')}
							</div>
							<div className="modula-bulk-edit__col modula-bulk-edit__col--description">
								{__('Caption', 'modula-best-grid-gallery')}
							</div>
							{showFiltersColumn ? (
								<div className="modula-bulk-edit__col modula-bulk-edit__col--filters">
									{__('Filters', 'modula-best-grid-gallery')}
								</div>
							) : null}
							<div className="modula-bulk-edit__col modula-bulk-edit__col--actions">
								<span className="screen-reader-text">
									{__('Actions', 'modula-best-grid-gallery')}
								</span>
							</div>
						</div>

						<div className="modula-bulk-edit__sheet-body">
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
										filterSuggestions={filterSuggestions}
										aiConfigured={aiConfigured}
										patchRow={draft.patchRow}
										getRowField={draft.getRowField}
										galleryId={galleryId}
										previewStore={previewStore}
										runPersistTask={runPersistTask}
										onNotice={onNotice}
										onRowSaved={(id) =>
											draft.clearRowDraft?.(id)
										}
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
				</div>
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
