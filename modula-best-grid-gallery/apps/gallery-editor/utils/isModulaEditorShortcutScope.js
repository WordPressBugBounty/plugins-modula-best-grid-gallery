const SCOPE_SELECTOR =
	'.modula-takeover__shell, .modula-content-block-edit-modal';

/**
 * @param {EventTarget | null} target
 * @return {Element | null} The target itself, or a text node's parent element.
 */
function getTargetElement(target) {
	if (target instanceof Element) {
		return target;
	}
	if (target instanceof Node) {
		return target.parentElement;
	}
	return null;
}

/**
 * Whether a keydown event target sits inside UI where Modula owns the editor
 * shortcuts (undo/redo): the takeover shell or the content block modal.
 *
 * @param {EventTarget | null} target
 * @return {boolean}
 */
export function isModulaEditorShortcutScope(target) {
	const targetEl = getTargetElement(target);
	if (targetEl?.closest(SCOPE_SELECTOR)) {
		return true;
	}
	const ownerDocument = targetEl?.ownerDocument ?? document;
	const activeEl = ownerDocument.activeElement;
	if (activeEl instanceof Element && activeEl.closest(SCOPE_SELECTOR)) {
		return true;
	}
	// Fallback: keydown may target <body>/<html>; if Modula shell exists, keep ownership.
	return Boolean(ownerDocument.querySelector(SCOPE_SELECTOR));
}
