// Cell offsets (column, row) per arrow key.
const STEPS = {
	ArrowLeft: [-1, 0],
	ArrowRight: [1, 0],
	ArrowUp: [0, -1],
	ArrowDown: [0, 1],
};

/**
 * The cell a key moves to in a grid of cells numbered row by row. Arrows
 * stop at the edges rather than wrapping, so the pad maps to the picture;
 * Home and End go to the first and last cell.
 *
 * @param {string} key     `KeyboardEvent.key`.
 * @param {number} index   Current cell.
 * @param {number} columns Cells per row.
 * @param {number} count   Number of cells.
 * @return {number|null} The next cell, or null when the key does not move.
 */
export function gridIndexForKey(key, index, columns, count) {
	if ('Home' === key) {
		return 0;
	}
	if ('End' === key) {
		return count - 1;
	}
	const step = STEPS[key];
	if (undefined === step) {
		return null;
	}
	const rows = Math.ceil(count / columns);
	const column = Math.min(
		columns - 1,
		Math.max(0, (index % columns) + step[0])
	);
	const row = Math.min(
		rows - 1,
		Math.max(0, Math.floor(index / columns) + step[1])
	);

	return Math.min(count - 1, row * columns + column);
}
