/**
 * Selected Freeform tile chrome from the canvas "Canvas" gallery (artboard
 * "16 · Editor – Canvas gallery"): outline and resize handles, and the size
 * badge while resizing (the toolbar is `TileToolbar`). Rendered beside the
 * tiles, not in them: a tile clips its content to the tile radius, which would
 * cut the handles that sit across its edge.
 */
import { freeformRectangle } from 'gallery-shared/preview';

/** Resize handles, named by the edges they move; the gesture reads `n`/`s`/`e`/`w` from the name. */
const FREEFORM_RESIZE_HANDLES = ['nw', 'ne', 'sw', 'se', 'n', 's', 'w', 'e'];

/**
 * The only resize handles Freeform has: the canvas shows them on the selected
 * tile alone. `data-freeform-resize` names the handle for the gesture and E2E.
 *
 * @param {Object}   props
 * @param {Object}   props.rectangle           Painted tile box (`left`, `top`, `width`, `height`).
 * @param {Function} props.onHandlePointerDown `(event, handle)`; starts the resize gesture.
 */
export function FreeformSelectionFrame({ rectangle, onHandlePointerDown }) {
	return (
		<div
			className="modula-freeform-selection"
			style={rectangle}
			aria-hidden="true"
		>
			{FREEFORM_RESIZE_HANDLES.map((handle) => (
				<span
					key={handle}
					data-freeform-resize={handle}
					className={`modula-freeform-selection__handle is-${handle}`}
					onPointerDown={(event) =>
						onHandlePointerDown(event, handle)
					}
				/>
			))}
		</div>
	);
}

/**
 * Cell span of the tile being resized, under it ("8 × 6").
 *
 * @param {Object} props
 * @param {Object} props.placement Live cell rectangle.
 * @param {Object} props.metrics   Freeform cell metrics.
 */
export function FreeformSizeBadge({ placement, metrics }) {
	const { left, top, width, height } = freeformRectangle(placement, metrics);
	return (
		<span
			className="modula-freeform-selection__size"
			style={{ left: left + width / 2, top: top + height }}
			aria-hidden="true"
		>
			{`${placement.w} × ${placement.h}`}
		</span>
	);
}
