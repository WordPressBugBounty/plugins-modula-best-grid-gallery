import { useRef, useState } from '@wordpress/element';

const INDENT = '  ';

// One indent level at the start of a line: up to two spaces, or a tab.
const LEADING_INDENT = /^( {1,2}|\t)/;

/**
 * Textarea props for the Custom CSS code editor.
 *
 * While the field has focus and holds edits, it shows its own draft, so a
 * save response that rewrites the stored CSS does not replace the text or
 * move the caret. Without local edits, and once it loses focus, it shows the
 * stored value, so undo, reset and the AI apply still reach it.
 *
 * Tab indents and Shift+Tab outdents through `onChange`; Escape, then Tab,
 * leaves the editor (as in WordPress's code editor).
 *
 * @param {Object}   args
 * @param {string}   args.value    Stored CSS.
 * @param {Function} args.onChange Receives the edited CSS.
 * @return {{ value: string, onChange: Function, onKeyDown: Function, onBlur: Function }}
 *         Props for admin-ui's Textarea (`onChange` receives the string value).
 */
export function useCssCodeEditor({ value, onChange }) {
	// Edits since the field took focus; null while there are none.
	const [draft, setDraft] = useState(null);
	const escapedRef = useRef(false);

	const handleChange = (next) => {
		setDraft(next);
		onChange(next);
	};

	const handleKeyDown = (event) => {
		const isLeaving = escapedRef.current;
		escapedRef.current = event.key === 'Escape';
		if (event.key !== 'Tab' || isLeaving || hasCommandModifier(event)) {
			return;
		}
		event.preventDefault();
		indentSelection(event.currentTarget, event.shiftKey, handleChange);
	};

	return {
		value: draft ?? value,
		onChange: handleChange,
		onKeyDown: handleKeyDown,
		onBlur: () => setDraft(null),
	};
}

/**
 * @param {KeyboardEvent} event
 * @return {boolean} Whether Ctrl, Cmd or Alt is held (browser and OS shortcuts).
 */
function hasCommandModifier(event) {
	return event.ctrlKey || event.metaKey || event.altKey;
}

/**
 * Indents (or outdents) the textarea's selection.
 *
 * @param {HTMLTextAreaElement} textarea
 * @param {boolean}             outdent
 * @param {Function}            onEdit   Receives the edited text when the browser fires no `input`.
 */
function indentSelection(textarea, outdent, onEdit) {
	const edit = getIndentEdit(
		textarea.value,
		textarea.selectionStart,
		textarea.selectionEnd,
		outdent
	);
	if (edit === null) {
		return;
	}
	textarea.setSelectionRange(edit.from, edit.to);
	if (!replaceSelection(textarea, edit.text)) {
		textarea.setRangeText(edit.text, edit.from, edit.to);
		onEdit(textarea.value);
	}
	textarea.setSelectionRange(edit.selectionStart, edit.selectionEnd);
}

/**
 * Replaces the selection as typing would: the browser keeps the edit in its
 * own undo history and fires `input`, which reaches onChange.
 *
 * @param {HTMLTextAreaElement} textarea
 * @param {string}              text
 * @return {boolean} Whether the browser made the edit.
 */
function replaceSelection(textarea, text) {
	const doc = textarea.ownerDocument;
	if (typeof doc.execCommand !== 'function') {
		return false;
	}
	return text === ''
		? doc.execCommand('delete')
		: doc.execCommand('insertText', false, text);
}

/**
 * The text replacement for Tab (or Shift+Tab with `outdent`). Tab at a bare
 * caret inserts one indent; otherwise every line the selection touches
 * shifts by one level.
 *
 * @param {string}  text
 * @param {number}  start   Selection start.
 * @param {number}  end     Selection end.
 * @param {boolean} outdent
 * @return {{ from: number, to: number, text: string, selectionStart: number, selectionEnd: number }|null}
 *         The range to replace, its new text and the selection after it, or null when nothing changes.
 */
function getIndentEdit(text, start, end, outdent) {
	if (!outdent && start === end) {
		const caret = start + INDENT.length;
		return {
			from: start,
			to: end,
			text: INDENT,
			selectionStart: caret,
			selectionEnd: caret,
		};
	}

	const from = text.lastIndexOf('\n', start - 1) + 1;
	const to = getLinesEnd(text, start, end);
	const lines = text.slice(from, to).split('\n');
	const shifted = lines.map((line) =>
		outdent ? line.replace(LEADING_INDENT, '') : INDENT + line
	);
	const block = shifted.join('\n');
	const sizeChange = block.length - (to - from);
	if (sizeChange === 0) {
		return null;
	}

	const firstLineChange = shifted[0].length - lines[0].length;
	const selectionStart =
		start === from ? from : Math.max(from, start + firstLineChange);
	// An end inside the removed indent of the last line stays on that line.
	const lastLineStart =
		from + block.length - shifted[shifted.length - 1].length;
	return {
		from,
		to,
		text: block,
		selectionStart,
		selectionEnd:
			start === end
				? selectionStart
				: Math.max(lastLineStart, end + sizeChange),
	};
}

/**
 * End of the last line the selection touches. A selection that ends at the
 * start of a line does not include that line.
 *
 * @param {string} text
 * @param {number} start
 * @param {number} end
 * @return {number} Offset of that line's end.
 */
function getLinesEnd(text, start, end) {
	const last = end > start && text[end - 1] === '\n' ? end - 1 : end;
	const next = text.indexOf('\n', last);
	return next === -1 ? text.length : next;
}
