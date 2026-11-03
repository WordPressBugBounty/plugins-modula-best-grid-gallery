/**
 * Reorder dialog (canvas "1 · Editor", `reorder.open`), opened from the Sort
 * popover's "Open drag-and-drop reorder": a grid of the document's items to
 * drag, or move with the arrows, then Save order. Cancel, Close and Escape
 * drop the draft. The editor owns the draft (`useReorderDraft`), the copy
 * and the save.
 */
import { __ } from '@wordpress/i18n';
import { Button, Dialog } from 'admin-ui';
import {
	DndContext,
	PointerSensor,
	closestCenter,
	useSensor,
	useSensors,
} from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import AdminUiScope from '../appearance/AdminUiScope';
import CanvasReorderTile from './CanvasReorderTile';
import '../styles/_reorder-dialog.scss';

/**
 * @param {{
 *   title: string,
 *   subtitle: string,
 *   emptyMessage: string,
 *   items: import('./CanvasReorderTile').CanvasReorderItem[],
 *   onDragEnd: (event: import('@dnd-kit/core').DragEndEvent) => void,
 *   onMove: (id: string, offset: -1|1) => void,
 *   onSave: () => void,
 *   onClose: () => void,
 * }} props `items` in draft order; `onSave` writes them, then the dialog closes.
 */
export default function CanvasReorderDialog({
	title,
	subtitle,
	emptyMessage,
	items,
	onDragEnd,
	onMove,
	onSave,
	onClose,
}) {
	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
	);

	// The dialog closes as the save starts; the write finishes behind it, so
	// a failure shows in the save status and the Sort popover.
	const saveOrder = () => {
		onSave();
		onClose();
	};

	return (
		<AdminUiScope>
			<Dialog
				open
				onClose={onClose}
				title={title}
				subtitle={subtitle}
				closeLabel={__('Close reorder', 'modula-best-grid-gallery')}
				className="modula-takeover__reorder-dialog"
			>
				<div className="modula-takeover__reorder-scroll">
					{items.length ? (
						<DndContext
							sensors={sensors}
							collisionDetection={closestCenter}
							onDragEnd={onDragEnd}
						>
							<SortableContext
								items={items.map((item) => item.id)}
								strategy={rectSortingStrategy}
							>
								<ul className="modula-takeover__reorder-grid">
									{items.map((item, index) => (
										<CanvasReorderTile
											key={item.id}
											item={item}
											position={index + 1}
											isFirst={index === 0}
											isLast={index === items.length - 1}
											onMove={(offset) =>
												onMove(item.id, offset)
											}
										/>
									))}
								</ul>
							</SortableContext>
						</DndContext>
					) : (
						<p className="modula-takeover__reorder-empty">
							{emptyMessage}
						</p>
					)}
				</div>
				<div className="modula-takeover__reorder-footer">
					<Button variant="link" onClick={onClose}>
						{__('Cancel', 'modula-best-grid-gallery')}
					</Button>
					<Button
						variant="primary"
						disabled={!items.length}
						onClick={saveOrder}
					>
						{__('Save order', 'modula-best-grid-gallery')}
					</Button>
				</div>
			</Dialog>
		</AdminUiScope>
	);
}
