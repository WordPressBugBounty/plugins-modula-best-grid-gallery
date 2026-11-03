import { useEffect } from '@wordpress/element';
import { fieldControlId } from '../fields/fieldControlId';
import { findSettingRow } from '../sidebar/settingAnchor';

// How long a revealed row stays highlighted (matches the CSS fade).
const HIGHLIGHT_MS = 1600;

const FOCUSABLE =
	'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

/**
 * @return {boolean} True when the visitor asked for reduced motion.
 */
function prefersReducedMotion() {
	return (
		typeof window.matchMedia === 'function' &&
		window.matchMedia('(prefers-reduced-motion: reduce)').matches
	);
}

/**
 * @param {Element} row
 * @param {string}  anchor
 * @return {HTMLElement|null} The setting's own control, else the row's first focusable element.
 */
function findRowControl(row, anchor) {
	const control = row.ownerDocument.getElementById(fieldControlId(anchor));
	if (control && row.contains(control)) {
		return control;
	}
	return row.querySelector(FOCUSABLE);
}

/**
 * After Setting search chooses a result, scroll its panel row into view,
 * highlight it briefly and move focus to its control. Rows carry their
 * anchors (`settingAnchorProps`). The panel renders the row in the same
 * commit that sets the target, so the effect finds it.
 *
 * @param {{ current: HTMLElement|null }} containerRef The panel's scroll area.
 * @param {{ anchor: string }|null}       target       A new object per choice.
 */
export function useRevealSettingRow(containerRef, target) {
	useEffect(() => {
		const container = containerRef.current;
		if (!target || !container) {
			return undefined;
		}
		const row = findSettingRow(container, target.anchor);
		if (!row) {
			// Every result has a row (Jest pins the index to the panel).
			return undefined;
		}
		row.scrollIntoView({
			block: 'center',
			behavior: prefersReducedMotion() ? 'auto' : 'smooth',
		});
		findRowControl(row, target.anchor)?.focus({ preventScroll: true });
		row.setAttribute('data-setting-search-hit', '');
		const timer = window.setTimeout(
			() => row.removeAttribute('data-setting-search-hit'),
			HIGHLIGHT_MS
		);
		return () => {
			window.clearTimeout(timer);
			row.removeAttribute('data-setting-search-hit');
		};
	}, [containerRef, target]);
}
