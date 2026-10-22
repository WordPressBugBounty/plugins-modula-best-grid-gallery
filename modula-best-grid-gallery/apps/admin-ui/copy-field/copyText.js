/**
 * Copies text to the clipboard. The Clipboard API exists only in a secure
 * context, so a plain-HTTP admin that isn't localhost copies through a
 * hidden textarea and `execCommand('copy')` instead. The fallback also runs
 * when the API refuses.
 *
 * @param {string} text
 * @return {Promise<void>} Rejects when neither way copied the text.
 */
export async function copyText(text) {
	if (!window.navigator?.clipboard?.writeText) {
		copyThroughTextarea(text);
		return;
	}

	try {
		await window.navigator.clipboard.writeText(text);
	} catch (error) {
		// A refused write (no permission, document not focused) still has
		// the fallback; its failure is the one reported.
		copyThroughTextarea(text);
	}
}

/**
 * Copies text with the legacy `execCommand('copy')` from a textarea kept
 * off screen, then removes the textarea.
 *
 * @param {string} text
 * @throws {Error} When the browser copied nothing.
 */
function copyThroughTextarea(text) {
	const textarea = document.createElement('textarea');
	textarea.value = text;
	textarea.setAttribute('readonly', '');
	textarea.style.position = 'fixed';
	textarea.style.left = '-9999px';
	document.body.appendChild(textarea);
	textarea.select();
	try {
		if (!document.execCommand('copy')) {
			throw new Error('Copy command was refused');
		}
	} finally {
		document.body.removeChild(textarea);
	}
}
