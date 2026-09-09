/**
 * Debounce and clobber policy for gallery item title/caption autosave.
 *
 * Persist only after a real typing pause. In-flight PATCH / media refetch must
 * not replace newer local title or caption (including while those fields are
 * focused).
 */

/** Pause after the last keystroke before image metadata PATCH (ms). */
export const IMAGE_METADATA_AUTOSAVE_MS = 1000;

export const IMAGE_METADATA_PROTECTED_KEYS = ['title', 'description'];

/**
 * @param {string|null|undefined} value
 * @return {string}
 */
function asPlainFieldText(value) {
	if (value === null || value === undefined) {
		return '';
	}
	return String(value);
}

/**
 * @param {string|null|undefined} fieldName
 * @return {boolean}
 */
export function isProtectedImageMetadataFieldName(fieldName) {
	if (typeof fieldName !== 'string') {
		return false;
	}
	const n = fieldName.trim().toLowerCase();
	if (n === 'title' || n === 'description' || n === 'caption') {
		return true;
	}
	return n.endsWith('-title') || n.endsWith('-caption');
}

/**
 * Map a focused control to the metadata form key that must not be clobbered.
 *
 * @param {{ id?: string, getAttribute?: function(string): string|null }|null|undefined} el
 * @return {'title'|'description'|null}
 */
export function focusedImageMetadataProtectedFieldName(el) {
	if (!el || typeof el !== 'object') {
		return null;
	}
	const name =
		typeof el.getAttribute === 'function'
			? el.getAttribute('name') || ''
			: '';
	const id = typeof el.id === 'string' ? el.id : '';
	const token = name || id;
	if (!isProtectedImageMetadataFieldName(token)) {
		return null;
	}
	const lower = token.trim().toLowerCase();
	if (lower === 'title' || lower.endsWith('-title')) {
		return 'title';
	}
	return 'description';
}

/**
 * Whether a save snapshot or WP-media refetch may `form.reset` the live values.
 *
 * False while title/caption is focused, or when local text has moved past the
 * incoming snapshot (in-flight PATCH vs later keystrokes).
 *
 * @param {{
 *   focusedProtectedKey?: 'title'|'description'|null,
 *   currentValues?: Object|null,
 *   incomingValues?: Object|null,
 * }} args
 * @return {boolean}
 */
export function shouldApplyImageMetadataExternalReset({
	focusedProtectedKey = null,
	currentValues = null,
	incomingValues = null,
} = {}) {
	if (
		focusedProtectedKey === 'title' ||
		focusedProtectedKey === 'description'
	) {
		return false;
	}
	const current =
		currentValues && typeof currentValues === 'object' ? currentValues : {};
	const incoming =
		incomingValues && typeof incomingValues === 'object'
			? incomingValues
			: {};
	for (const key of IMAGE_METADATA_PROTECTED_KEYS) {
		if (
			asPlainFieldText(current[key]) !== asPlainFieldText(incoming[key])
		) {
			return false;
		}
	}
	return true;
}

/**
 * Apply an incoming snapshot but keep local title/caption when they differ.
 *
 * @param {{ currentValues?: Object|null, incomingValues?: Object|null }} args
 * @return {Object}
 */
export function mergeImageMetadataSnapshotPreservingLocalProtected({
	currentValues = null,
	incomingValues = null,
} = {}) {
	const current =
		currentValues && typeof currentValues === 'object' ? currentValues : {};
	const incoming =
		incomingValues && typeof incomingValues === 'object'
			? incomingValues
			: {};
	const next = { ...current, ...incoming };
	for (const key of IMAGE_METADATA_PROTECTED_KEYS) {
		if (
			Object.prototype.hasOwnProperty.call(current, key) &&
			asPlainFieldText(current[key]) !== asPlainFieldText(incoming[key])
		) {
			next[key] = current[key];
		}
	}
	return next;
}
