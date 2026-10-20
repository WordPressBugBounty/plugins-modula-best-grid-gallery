import { resolveFieldRowLabel } from '../../../logic/fieldRowLabel';

/**
 * aria-label for a toggle-kind switch.
 *
 * The row `<label>` targets the `modula-field-*` wrapper div (scroll targets and
 * CSS depend on that id), not the switch button, so name the switch after the
 * same row label. A visible `toggleLabel` already names it via Switch's label.
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
