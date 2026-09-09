/**
 * @param {object[]} fields Enriched fields.
 * @return {object[]} Same fields sorted by `editorUi.sortIndex` / `slot`.
 */
export function sortEnrichedFields(fields) {
	return [...fields].sort((a, b) => {
		const oui = a.editorUi || {};
		const vui = b.editorUi || {};
		const sa = oui.sortIndex ?? 10000 + oui._orig;
		const sb = vui.sortIndex ?? 10000 + vui._orig;
		if (sa !== sb) {
			return sa - sb;
		}
		return (oui.slot ?? 0) - (vui.slot ?? 0);
	});
}

/**
 * @param {object[]} sortedFields Enriched fields in display order.
 * @return {{ type: 'single' | 'composite', fields: object[] }[]} Rows for rendering.
 */
export function bucketFieldsIntoDisplayRows(sortedFields) {
	/** @type {{ type: 'single' | 'composite', fields: object[] }[]} */
	const out = [];
	for (const f of sortedFields) {
		const row = f.editorUi?.row;
		if (!row) {
			out.push({ type: 'single', fields: [f] });
			continue;
		}
		const last = out[out.length - 1];
		if (
			last &&
			last.type === 'composite' &&
			last.fields[0]?.editorUi?.row === row
		) {
			last.fields.push(f);
		} else {
			out.push({ type: 'composite', fields: [f] });
		}
	}
	return out;
}
