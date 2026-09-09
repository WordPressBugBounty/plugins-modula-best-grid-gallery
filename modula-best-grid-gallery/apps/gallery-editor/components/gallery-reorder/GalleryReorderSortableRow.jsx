/**
 * Sortable gallery row for manual reorder (domain DnD; IconButton for actions).
 */
import { __ } from '@wordpress/i18n';
import { Icon, dragHandle, pencil } from '@wordpress/icons';
import { IconButton } from 'shared-ui';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

/**
 * @param {{
 *   item: { id: string, label: string, thumb: string, blockBg?: string },
 *   rowIndex: number,
 *   onEditBlock?: () => void,
 *   registerHandleRef?: (id: string, el: Element | null) => void,
 * }} props
 */
export default function GalleryReorderSortableRow({
	item,
	rowIndex,
	onEditBlock,
	registerHandleRef,
}) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: item.id });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	};

	return (
		<li
			ref={setNodeRef}
			style={style}
			className={`modula-gallery-takeover__reorder-row${
				isDragging ? ' is-dragging' : ''
			}${item.blockBg ? ' is-embedded-block' : ''}`}
		>
			<div className="modula-gallery-takeover__reorder-thumb-wrap">
				{item.blockBg ? (
					<div
						className="modula-gallery-takeover__reorder-thumb modula-gallery-takeover__reorder-thumb--block"
						style={{ backgroundColor: item.blockBg }}
						aria-hidden
					/>
				) : null}
				{!item.blockBg && item.thumb ? (
					<img
						className="modula-gallery-takeover__reorder-thumb"
						src={item.thumb}
						alt=""
						width={48}
						height={48}
						decoding="async"
						loading="lazy"
					/>
				) : null}
				{!item.blockBg && !item.thumb ? (
					<div className="modula-gallery-takeover__reorder-thumb modula-gallery-takeover__reorder-thumb--placeholder" />
				) : null}
			</div>
			<div className="modula-gallery-takeover__reorder-meta">
				<span className="modula-gallery-takeover__reorder-label">
					{item.label}
				</span>
				<span className="modula-gallery-takeover__reorder-sub">
					{__('Row', 'modula-best-grid-gallery')} {rowIndex + 1}
				</span>
			</div>
			<div className="modula-gallery-takeover__reorder-row-actions">
				{onEditBlock ? (
					<IconButton
						className="modula-gallery-takeover__reorder-edit"
						label={__(
							'Edit content block',
							'modula-best-grid-gallery'
						)}
						onClick={(e) => {
							e.preventDefault();
							e.stopPropagation();
							onEditBlock();
						}}
					>
						<Icon icon={pencil} size={18} />
					</IconButton>
				) : null}
				<IconButton
					className="modula-gallery-takeover__reorder-handle"
					data-modula-reorder-handle={item.id}
					ref={(el) => registerHandleRef?.(item.id, el)}
					label={__('Drag to reorder', 'modula-best-grid-gallery')}
					{...attributes}
					{...listeners}
				>
					<Icon icon={dragHandle} size={18} />
				</IconButton>
			</div>
		</li>
	);
}
