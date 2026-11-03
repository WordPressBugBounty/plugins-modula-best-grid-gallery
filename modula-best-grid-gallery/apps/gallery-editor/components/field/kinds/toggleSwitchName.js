import { resolveFieldRowLabel } from '../../../logic/fieldRowLabel';

/**
 * aria-label for a toggle-kind switch.
 *
 * The row `<label>` points at the switch (`fieldControlId`), but rows that
 * render a toggle without that label (composite cells, hub rows) still need a
 * name, so the switch carries the row label as its aria-label. A visible
 * `toggleLabel` already names it through its own label.
 *
 * @param {Object} field
 * @param {string} visibleLabel Switch's own label text ('' when none).
 * @return {string|undefined} aria-label, or undefined to leave it unset.
 */
export function resolveToggleSwitchAriaLabel(field, visibleLabel) {
	if (visibleLabel !== '') {
		return undefined;
	}
	const rowLabel = resolveFieldRowLabel(field);
	return rowLabel !== '' ? rowLabel : undefined;
}
