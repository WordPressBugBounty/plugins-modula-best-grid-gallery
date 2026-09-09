/**
 * Manual drag-and-drop reorder step — settings-column takeover.
 */
import { __ } from '@wordpress/i18n';
import { Notice } from '@wordpress/components';
import { ActionRow, Button } from 'shared-ui';
import {
	DndContext,
	KeyboardSensor,
	PointerSensor,
	closestCenter,
	useSensor,
	useSensors,
} from '@dnd-kit/core';
import {
	SortableContext,
	sortableKeyboardCoordinates,
	verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import SettingsPanelHeader from '../sidebar/settings-panel/SettingsPanelHeader';
import GalleryReorderSortableRow from './GalleryReorderSortableRow';
import { REORDER_DND_MODIFIERS } from './galleryReorderUtils';

/**
 * @param {{
 *   closePanel: () => void,
 *   errorMessage: string,
 *   clearError: () => void,
 *   orderKeys: string[],
 *   orderedRows: Array<{
 *     sortKey: string,
 *     label: string,
 *     thumb: string,
 *     blockBg: string,
 *     rowType: string,
 *     rawRow: Record<string, unknown>,
 *   }>,
 *   onEditBlock: (rawRow: Record<string, unknown>) => void,
 *   registerReorderHandleRef: (id: string, el: Element | null) => void,
 *   onDragEnd: import('@dnd-kit/core').DragEndEvent => void,
 *   onBackToSetup: () => void,
 *   onApplyOrder: () => void,
 *   canApplyOrder: boolean,
 * }} props
 */
export default function GalleryReorderListStep({
	closePanel,
	errorMessage,
	clearError,
	orderKeys,
	orderedRows,
	onEditBlock,
	registerReorderHandleRef,
	onDragEnd,
	onBackToSetup,
	onApplyOrder,
	canApplyOrder,
}) {
	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		})
	);

	return (
		<div className="modula-settings-panel modula-gallery-reorder-sidebar">
			<SettingsPanelHeader
				title={__('Reorder gallery', 'modula-best-grid-gallery')}
				description={__(
					'Drag rows to change order (images, videos, and content blocks). Use the pencil on a content block to edit it in the sidebar.',
					'modula-best-grid-gallery'
				)}
				isNested
				parentTitle={__('Sort & order', 'modula-best-grid-gallery')}
				onBack={onBackToSetup}
			/>
			{errorMessage ? (
				<Notice
					className="modula-gallery-reorder-sidebar__notice"
					status="error"
					isDismissible
					onRemove={clearError}
				>
					{errorMessage}
				</Notice>
			) : null}
			<div className="modula-settings-panel__scroll modula-gallery-reorder-sidebar__scroll">
				<div className="modula-gallery-takeover__reorder-body">
					{orderedRows.length ? (
						<DndContext
							modifiers={REORDER_DND_MODIFIERS}
							sensors={sensors}
							collisionDetection={closestCenter}
							onDragEnd={onDragEnd}
						>
							<SortableContext
								items={orderKeys}
								strategy={verticalListSortingStrategy}
							>
								<ul className="modula-gallery-takeover__reorder-list">
									{orderedRows.map((r, idx) => (
										<GalleryReorderSortableRow
											key={r.sortKey}
											item={{
												id: r.sortKey,
												label: r.label,
												thumb: r.thumb,
												blockBg: r.blockBg,
											}}
											rowIndex={idx}
											registerHandleRef={
												registerReorderHandleRef
											}
											onEditBlock={
												r.rowType === 'content_block'
													? () =>
															onEditBlock(
																r.rawRow
															)
													: undefined
											}
										/>
									))}
								</ul>
							</SortableContext>
						</DndContext>
					) : (
						<p className="modula-gallery-takeover__reorder-empty">
							{__(
								'No items in this gallery yet.',
								'modula-best-grid-gallery'
							)}
						</p>
					)}
				</div>
			</div>
			<footer className="modula-gallery-reorder-sidebar__foot modula-gallery-reorder-sidebar__foot--split">
				<Button type="button" variant="ghost" onClick={onBackToSetup}>
					{__('Back', 'modula-best-grid-gallery')}
				</Button>
				<ActionRow>
					<Button type="button" variant="ghost" onClick={closePanel}>
						{__('Close', 'modula-best-grid-gallery')}
					</Button>
					<Button
						type="button"
						variant="primary"
						disabled={!canApplyOrder}
						onClick={onApplyOrder}
					>
						{__('Apply order', 'modula-best-grid-gallery')}
					</Button>
				</ActionRow>
			</footer>
		</div>
	);
}
