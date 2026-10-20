/**
 * Hands the browser the Modula Debug Log to save, from the body its
 * download route answered with (JSON with the file's contents, not a file).
 *
 * @param {string} filename Suggested file name.
 * @param {string} body     The log's JSON Lines.
 */
export function downloadDebugLog(filename, body) {
	const blob = new Blob([body ?? ''], {
		type: 'application/x-ndjson;charset=utf-8',
	});
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = filename || 'modula-debug.jsonl';
	document.body.appendChild(link);
	link.click();
	link.remove();
	URL.revokeObjectURL(url);
}
