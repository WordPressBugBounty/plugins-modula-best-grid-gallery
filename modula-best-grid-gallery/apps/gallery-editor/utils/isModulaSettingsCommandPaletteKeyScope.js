/**
 * Whether a keydown event target sits inside UI where Modula should own Ctrl/Cmd+K
 * (takeover shell, metabox shell, or our command palette portal) — avoids conflicting
 * with WordPress core command palette (primary+K), which bails when defaultPrevented.
 *
 * @param {EventTarget | null} target
 * @return {boolean}
 */
export function isModulaSettingsCommandPaletteKeyScope(target) {
	const scopeSelector =
		'.modula-gallery-takeover__shell, .modula-settings-editor__shell, .modula-cmd-palette, .modula-content-block-edit-modal';
	const targetEl =
		target instanceof Element
			? target
			: target instanceof Node
				? target.parentElement
				: null;
	if (targetEl?.closest(scopeSelector)) {
		return true;
	}
	const activeEl = document.activeElement;
	if (activeEl instanceof Element && activeEl.closest(scopeSelector)) {
		return true;
	}
	// Fallback: keydown may target <body>/<html>; if Modula shell exists, keep ownership.
	return Boolean(document.querySelector(scopeSelector));
}
