/**
 * Legacy metabox / admin markup discovery. Prefer React refs for new UI;
 * this isolates `document.querySelector` usage for classic Modula DOM IDs.
 *
 * @param {string[]} selectors
 * @return {HTMLElement|null} First matching element in document order, or null.
 */
export function firstPresentDomSelector(selectors) {
	if (typeof document === 'undefined') {
		return null;
	}
	for (const sel of selectors) {
		const el = document.querySelector(sel);
		if (el instanceof HTMLElement) {
			return el;
		}
	}
	return null;
}
