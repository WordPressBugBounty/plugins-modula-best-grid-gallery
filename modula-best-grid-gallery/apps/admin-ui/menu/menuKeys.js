import { tabKeyTarget } from '../tabs/tabKeyTarget';

// A vertical menu moves like a horizontal tab list, on the other arrows.
const AS_TAB_KEY = {
	ArrowDown: 'ArrowRight',
	ArrowUp: 'ArrowLeft',
	Home: 'Home',
	End: 'End',
};

/**
 * The menu item a key moves focus to (WAI-ARIA menu pattern): arrows wrap,
 * Home and End go to the ends. With no item focused, Down starts at the
 * first item and Up at the last.
 *
 * @param {string} key   `KeyboardEvent.key`.
 * @param {number} index Focused item, or -1.
 * @param {number} count Number of items.
 * @return {number|null} The next index, or null when the key does not move focus.
 */
export function menuIndexForKey(key, index, count) {
	const tabKey = AS_TAB_KEY[key];

	return undefined === tabKey ? null : tabKeyTarget(tabKey, index, count);
}
