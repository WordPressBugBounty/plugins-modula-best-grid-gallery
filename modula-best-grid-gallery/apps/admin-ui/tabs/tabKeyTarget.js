/**
 * Index of the tab a key moves to in a horizontal tab list (WAI-ARIA tabs
 * pattern): arrows wrap around, Home and End jump to the ends.
 *
 * @param {string} key          `KeyboardEvent.key`.
 * @param {number} currentIndex Selected tab, or -1 when none is selected.
 * @param {number} count        Number of tabs.
 * @return {number|null} Target index, or null when the key does not move.
 */
export function tabKeyTarget(key, currentIndex, count) {
	if (count < 1) {
		return null;
	}

	switch (key) {
		case 'ArrowRight':
			return (currentIndex + 1) % count;
		case 'ArrowLeft':
			return currentIndex < 1 ? count - 1 : currentIndex - 1;
		case 'Home':
			return 0;
		case 'End':
			return count - 1;
		default:
			return null;
	}
}
