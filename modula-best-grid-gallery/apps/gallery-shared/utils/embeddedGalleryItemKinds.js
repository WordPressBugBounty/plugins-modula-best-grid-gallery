/**
 * Detect v2 embedded rows (content block / shortcode) for layout + preview toolbars.
 * Bootstrap or legacy paths may omit `itemKind` while still carrying embedded fields.
 *
 * @package
 */

/**
 * @param {unknown} raw
 * @return {boolean}
 */
function isPureAttachmentRowId(raw) {
	if (raw === undefined || raw === null) {
		return false;
	}
	const s = String(raw).trim();
	if (s === '') {
		return false;
	}
	return /^\d+$/.test(s);
}

/**
 * v2 embedded tiles use UUID/string ids — not attachment numeric ids. Never use `id` alone
 * when it looks like a media id: that falsely matched images once `hasOwnProperty('shortcodeHtml')`
 * or block keys existed on the object (empty strings), breaking delete (save-merged vs by-index).
 *
 * @param {Object} row
 * @return {boolean}
 */
function hasEmbeddedOnlyIdShape(row) {
	const e = row.embeddedId;
	if (e !== undefined && e !== null && String(e).trim() !== '') {
		return !isPureAttachmentRowId(e);
	}
	const id = row.id;
	if (
		id !== undefined &&
		id !== null &&
		String(id).trim() !== '' &&
		typeof id === 'string'
	) {
		return !isPureAttachmentRowId(id);
	}
	return false;
}

/**
 * @param {Object} row
 * @return {boolean}
 */
function rowHasMeaningfulBlockFields(row) {
	const html = row.blockBodyHtml;
	if (typeof html === 'string' && html.trim() !== '') {
		return true;
	}
	const bg = row.blockBackgroundColor;
	if (bg != null && String(bg).trim() !== '') {
		return true;
	}
	const fg = row.blockTextColor;
	if (fg != null && String(fg).trim() !== '') {
		return true;
	}
	const imageId = parseInt(String(row.blockBackgroundImageId ?? ''), 10);
	if (Number.isFinite(imageId) && imageId > 0) {
		return true;
	}
	return false;
}

/**
 * @param {Object} row
 * @return {boolean}
 */
function rowHasMeaningfulShortcodeFields(row) {
	const raw = row.shortcodeRaw;
	if (typeof raw === 'string' && raw.trim() !== '') {
		return true;
	}
	const html = row.shortcodeHtml;
	if (typeof html === 'string' && html.trim() !== '') {
		return true;
	}
	return false;
}

/**
 * @param {unknown} row
 * @return {boolean}
 */
export function isEmbeddedGalleryItemRow(row) {
	if (!row || typeof row !== 'object') {
		return false;
	}
	if (row.itemKind === 'content_block' || row.itemKind === 'shortcode') {
		return true;
	}
	if (!hasEmbeddedOnlyIdShape(row)) {
		return false;
	}
	if (rowHasMeaningfulBlockFields(row)) {
		return true;
	}
	if (rowHasMeaningfulShortcodeFields(row)) {
		return true;
	}
	return false;
}

/**
 * @param {unknown} row
 * @return {boolean}
 */
export function isContentBlockGalleryItemRow(row) {
	if (!row || typeof row !== 'object') {
		return false;
	}
	if (row.itemKind === 'content_block') {
		return true;
	}
	if (row.itemKind === 'shortcode') {
		return false;
	}
	if (!hasEmbeddedOnlyIdShape(row)) {
		return false;
	}
	if (rowHasMeaningfulShortcodeFields(row)) {
		return false;
	}
	return rowHasMeaningfulBlockFields(row);
}
