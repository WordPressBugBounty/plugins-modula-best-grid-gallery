/**
 * Shared clipboard helper for listing shortcodes.
 *
 * @param {string} text
 * @return {Promise<void>}
 */
export async function copyText(text) {
	if (navigator.clipboard?.writeText) {
		await navigator.clipboard.writeText(text);
		return;
	}
	const ta = document.createElement('textarea');
	ta.value = text;
	ta.setAttribute('readonly', '');
	ta.style.position = 'fixed';
	ta.style.left = '-9999px';
	document.body.appendChild(ta);
	ta.select();
	try {
		document.execCommand('copy');
	} finally {
		document.body.removeChild(ta);
	}
}
