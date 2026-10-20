/**
 * Index of the control Tab should move to inside a modal panel, so focus
 * cycles through the panel instead of leaving it: past the last control it
 * wraps to the first, before the first to the last.
 *
 * @param {boolean} shiftKey    Shift+Tab (backwards).
 * @param {number}  activeIndex Focused control, or -1 when focus is outside the panel.
 * @param {number}  count       Number of focusable controls in the panel.
 * @return {number|null} Target index, or null when the browser's own Tab is right.
 */
export function focusTrapTarget(shiftKey, activeIndex, count) {
	if (count < 1) {
		return null;
	}

	const first = 0;
	const last = count - 1;
	if (-1 === activeIndex) {
		return shiftKey ? last : first;
	}
	if (shiftKey && first === activeIndex) {
		return last;
	}
	if (!shiftKey && last === activeIndex) {
		return first;
	}

	return null;
}
