/*
 * Canvas toolbar placement ("16 · Editor – Canvas gallery"): 48px above the
 * tile, or 8px inside its top edge when the tile starts within 50px of the
 * surface top; its left edge follows the tile and keeps 300px of room.
 */
const TOOLBAR_ABOVE = 48;
const TOOLBAR_INSIDE = 8;
const TOOLBAR_FLIP_TOP = 50;
const TOOLBAR_RESERVED_WIDTH = 300;

/**
 * @param {{left: number, top: number}} rectangle    Painted tile box.
 * @param {number}                      surfaceWidth Painted surface width.
 * @return {{left: number, top: number}} Toolbar offset inside the surface.
 */
export function freeformToolbarPosition(rectangle, surfaceWidth) {
	return {
		left: Math.max(
			0,
			Math.min(rectangle.left, surfaceWidth - TOOLBAR_RESERVED_WIDTH)
		),
		top:
			rectangle.top < TOOLBAR_FLIP_TOP
				? rectangle.top + TOOLBAR_INSIDE
				: rectangle.top - TOOLBAR_ABOVE,
	};
}
