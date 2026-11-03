/**
 * Justified "Widen on hover" (Motion → This layout). While a mouse or pen is
 * over a tile, the tile grows wider in its row and the row's other tiles give
 * up the same width between them, in proportion to their widths, so the row
 * keeps its width and nothing wraps. The pointer stays on the tile it widens:
 * both of its edges move outwards.
 *
 * The layout owns each tile's width (`width: calc(<slot> + var(--modula-widen))`,
 * `data-modula-slot-width`, JustifiedGridLayout) and lets its images cover the
 * tile, so a wider tile shows more of the photo. This module only sets
 * `--modula-widen` (px) per tile; the transition is CSS (`@property` in
 * apps/frontend-gallery/_layout-motion.scss), so a re-layout on resize stays
 * instant.
 *
 * @package
 */

const WIDEN_TILE = '.modula-justified-grid--widen .modula-justified-tile';
const WIDEN_VAR = '--modula-widen';
const WIDEN_DURATION_VAR = '--modula-widen-duration';

/** The hovered tile grows by this share of its own width… */
const GROWTH = 0.3;
/** …taking at most this share of the rest of its row. */
const MAX_SHARE_OF_ROW = 0.2;
/** At normal speed; `motion.speed` scales it. */
const WIDEN_DURATION_MS = 450;

/**
 * @param {HTMLElement} tile
 * @return {number} The tile's width in the layout, before any widening.
 */
function slotWidthOf(tile) {
	return Number(tile.dataset.modulaSlotWidth) || 0;
}

/**
 * @param {HTMLElement} tile
 * @return {HTMLElement[]} The tiles of its row (same parent, same top), itself included.
 */
function rowOf(tile) {
	const top = tile.offsetTop;
	return [...tile.parentElement.children].filter(
		(sibling) =>
			sibling.matches(WIDEN_TILE) && Math.abs(sibling.offsetTop - top) < 1
	);
}

/**
 * Widens a tile at the expense of its row. Every width given up is whole
 * pixels and the tile takes exactly their sum, so the row never overflows.
 *
 * @param {HTMLElement} tile
 * @param {string}      duration CSS time.
 * @return {HTMLElement[]} The row's tiles, to restore later; empty when the row has no other tile or the tile's focal crop cannot grow (`data-modula-widen-fixed`).
 */
function widenTile(tile, duration) {
	if (tile.hasAttribute('data-modula-widen-fixed')) {
		return [];
	}
	const row = rowOf(tile);
	const others = row.filter((sibling) => sibling !== tile);
	const othersWidth = others.reduce((sum, t) => sum + slotWidthOf(t), 0);
	if (othersWidth <= 0) {
		return [];
	}
	const wanted = Math.min(
		slotWidthOf(tile) * GROWTH,
		othersWidth * MAX_SHARE_OF_ROW
	);
	let taken = 0;
	for (const other of others) {
		const given = Math.floor((wanted * slotWidthOf(other)) / othersWidth);
		other.style.setProperty(WIDEN_DURATION_VAR, duration);
		other.style.setProperty(WIDEN_VAR, `${-given}px`);
		taken += given;
	}
	tile.style.setProperty(WIDEN_DURATION_VAR, duration);
	tile.style.setProperty(WIDEN_VAR, `${taken}px`);
	return row;
}

/**
 * @param {HTMLElement[]} row
 */
function restoreRow(row) {
	row.forEach((tile) => tile.style.removeProperty(WIDEN_VAR));
}

/**
 * Starts widening the host's Justified tiles under the pointer.
 *
 * @param {HTMLElement} host       Gallery element.
 * @param {number}      speedScale `motion.speed` scale (getMotionSpeedScale).
 * @return {() => void} Stops, and gives every tile its own width back.
 */
export function widenJustifiedRows(host, speedScale) {
	const duration = `${Math.round(WIDEN_DURATION_MS * speedScale)}ms`;
	let widened = null;
	let row = [];

	const restore = () => {
		restoreRow(row);
		widened = null;
		row = [];
	};
	const onOver = (event) => {
		if (event.pointerType === 'touch') {
			return;
		}
		const tile =
			event.target instanceof window.Element
				? event.target.closest(WIDEN_TILE)
				: null;
		if (!tile || tile === widened || !host.contains(tile)) {
			return;
		}
		restore();
		widened = tile;
		row = widenTile(tile, duration);
	};
	// The gap between two tiles of a row keeps the widening; leaving the row's
	// grid restores it.
	const onOut = (event) => {
		const next = event.relatedTarget;
		if (
			widened &&
			!(
				next instanceof window.Node &&
				widened.parentElement?.contains(next)
			)
		) {
			restore();
		}
	};

	host.addEventListener('pointerover', onOver);
	host.addEventListener('pointerout', onOut);
	// A re-layout changes the slot widths the shares were computed from.
	window.addEventListener('resize', restore);
	return () => {
		host.removeEventListener('pointerover', onOver);
		host.removeEventListener('pointerout', onOut);
		window.removeEventListener('resize', restore);
		host.querySelectorAll(WIDEN_TILE).forEach((tile) => {
			tile.style.removeProperty(WIDEN_VAR);
			tile.style.removeProperty(WIDEN_DURATION_VAR);
		});
	};
}
