/**
 * A canvas tile's trash ("Remove from gallery" / "Remove from album"): removes
 * at once, with Undo in the editor's toast. It never starts the tile's click,
 * selection or a Custom Grid drag. Styled by editor-shell's `tile-trash` mixin
 * under the owning editor's class.
 *
 * @package
 */

/**
 * @param {unknown} event
 */
function stop(event) {
	event.preventDefault();
	event.stopPropagation();
}

/**
 * @param {Object}     props
 * @param {string}     props.className Owning editor's trash class.
 * @param {string}     props.label     Accessible name (names the item when it has a title).
 * @param {string}     props.title     Tooltip.
 * @param {() => void} props.onRemove
 */
export default function TileTrashButton({ className, label, title, onRemove }) {
	return (
		<button
			type="button"
			className={className}
			title={title}
			aria-label={label}
			onMouseDown={stop}
			onPointerDown={stop}
			onClick={(event) => {
				stop(event);
				onRemove();
			}}
		>
			<svg
				width="15"
				height="15"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="1.8"
				strokeLinecap="round"
				strokeLinejoin="round"
				aria-hidden="true"
				focusable="false"
			>
				<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
			</svg>
		</button>
	);
}
