/**
 * One tile of the Reorder dialog's grid (canvas "1 · Editor", `he-ro`): the
 * thumbnail, its place, and the arrows that move it one place. The whole
 * tile drags; an item with an edit action also has its pencil.
 */
import { useRef } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { Icon, chevronLeft, chevronRight, pencil } from '@wordpress/icons';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

/**
 * @typedef {Object} CanvasReorderEdit The pencil.
 * @property {string}     label   Its accessible name.
 * @property {() => void} onClick Its action.
 */

/**
 * @typedef {Object} CanvasReorderItem
 * @property {string}            id        The draft key.
 * @property {string}            label     Title: the tooltip and the arrows' names.
 * @property {string}            thumb     Thumbnail URL; empty draws stripes.
 * @property {string}            [blockBg] A content block's colour, drawn with its title instead of a thumbnail.
 * @property {CanvasReorderEdit} [edit]    The pencil; none without it.
 */

/**
 * @param {{
 *   item: CanvasReorderItem,
 *   position: number,
 *   isFirst: boolean,
 *   isLast: boolean,
 *   onMove: (offset: -1|1) => void,
 * }} props
 */
export default function CanvasReorderTile({
	item,
	position,
	isFirst,
	isLast,
	onMove,
}) {
	const tileRef = useRef(null);
	const { listeners, setNodeRef, transform, transition, isDragging, isOver } =
		useSortable({ id: item.id });

	const setTileRef = (el) => {
		tileRef.current = el;
		setNodeRef(el);
	};

	// Moving the tile re-inserts it, which can drop the focus. It goes back
	// to the same arrow, or to the other one when the move reached the first
	// or last place, where that arrow is not drawn.
	const move = (offset) => {
		onMove(offset);
		window.requestAnimationFrame(() => {
			const tile = tileRef.current;
			if (!tile || tile.contains(tile.ownerDocument.activeElement)) {
				return;
			}
			const arrow =
				tile.querySelector(
					`.modula-takeover__reorder-tile-arrow[data-offset="${offset}"]`
				) ?? tile.querySelector('.modula-takeover__reorder-tile-arrow');
			arrow?.focus();
		});
	};

	const classes = [
		'modula-takeover__reorder-tile',
		isDragging ? 'is-dragging' : '',
		isOver && !isDragging ? 'is-over' : '',
	]
		.filter(Boolean)
		.join(' ');

	return (
		<li
			ref={setTileRef}
			className={classes}
			title={item.label}
			style={{
				transform: CSS.Transform.toString(transform),
				transition,
			}}
			{...listeners}
		>
			{item.blockBg ? (
				<span
					className="modula-takeover__reorder-tile-media modula-takeover__reorder-tile-media--block"
					style={{ backgroundColor: item.blockBg }}
				>
					<span className="modula-takeover__reorder-tile-block-label">
						{item.label}
					</span>
				</span>
			) : null}
			{!item.blockBg && item.thumb ? (
				<img
					className="modula-takeover__reorder-tile-media"
					src={item.thumb}
					alt={item.label}
					draggable={false}
					decoding="async"
					loading="lazy"
				/>
			) : null}
			{!item.blockBg && !item.thumb ? (
				<span className="modula-takeover__reorder-tile-media modula-takeover__reorder-tile-media--placeholder" />
			) : null}
			<span className="modula-takeover__reorder-tile-position">
				{position}
			</span>
			{item.edit ? (
				<button
					type="button"
					className="modula-takeover__reorder-tile-button modula-takeover__reorder-tile-edit"
					aria-label={item.edit.label}
					onClick={item.edit.onClick}
				>
					<Icon icon={pencil} size={16} />
				</button>
			) : null}
			<span className="modula-takeover__reorder-tile-arrows">
				{isFirst ? null : (
					<button
						type="button"
						className="modula-takeover__reorder-tile-button modula-takeover__reorder-tile-arrow"
						data-offset="-1"
						aria-label={sprintf(
							/* translators: %s: item title */
							__('Move %s backward', 'modula-best-grid-gallery'),
							item.label
						)}
						onClick={() => move(-1)}
					>
						<Icon icon={chevronLeft} size={16} />
					</button>
				)}
				{isLast ? null : (
					<button
						type="button"
						className="modula-takeover__reorder-tile-button modula-takeover__reorder-tile-arrow"
						data-offset="1"
						aria-label={sprintf(
							/* translators: %s: item title */
							__('Move %s forward', 'modula-best-grid-gallery'),
							item.label
						)}
						onClick={() => move(1)}
					>
						<Icon icon={chevronRight} size={16} />
					</button>
				)}
			</span>
		</li>
	);
}
