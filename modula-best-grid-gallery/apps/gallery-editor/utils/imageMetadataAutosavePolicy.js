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
 * Classic caption editor id from WpClassicCaptionEditor
 * (`modula-img-meta-caption-${storeIndex}-${attachmentId}`), plus TinyMCE iframe.
 *
 * @param {string} token
 * @return {boolean}
 */
function isClassicCaptionEditorToken(token) {
	return token.trim().toLowerCase().startsWith('modula-img-meta-caption-');
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
	if (isClassicCaptionEditorToken(n)) {
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
 * @param {Object|null|undefined} values
 * @return {Object}
 */
function asValuesObject(values) {
	return values && typeof values === 'object' ? values : {};
}

/**
 * The clobber guard: of `keys`, the fields the user owns locally. A field is
 * owned when it is the focused title/caption, or when its text differs from
 * `referenceValues`.
 *
 * @param {{
 *   keys: string[],
 *   focusedProtectedKey?: 'title'|'description'|null,
 *   currentValues?: Object|null,
 *   referenceValues?: Object|null,
 * }} args
 * @return {string[]} Owned keys, in `keys` order.
 */
function locallyOwnedImageMetadataKeys({
	keys,
	focusedProtectedKey = null,
	currentValues = null,
	referenceValues = null,
}) {
	const current = asValuesObject(currentValues);
	const reference = asValuesObject(referenceValues);
	return keys.filter(
		(key) =>
			key === focusedProtectedKey ||
			asPlainFieldText(current[key]) !== asPlainFieldText(reference[key])
	);
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
	return (
		locallyOwnedImageMetadataKeys({
			keys: IMAGE_METADATA_PROTECTED_KEYS,
			focusedProtectedKey,
			currentValues,
			referenceValues: incomingValues,
		}).length === 0
	);
}

/**
 * Values for the panel's first WP-media hydration. The media request can answer
 * after the user started typing; fields edited since the panel opened (or the
 * focused title/caption) keep their local text, the rest take `hydratedValues`.
 *
 * @param {{
 *   focusedProtectedKey?: 'title'|'description'|null,
 *   currentValues?: Object|null,
 *   openingValues?: Object|null,
 *   hydratedValues?: Object|null,
 * }} args
 * @return {Object}
 */
export function mergeMediaHydrationPreservingLocalEdits({
	focusedProtectedKey = null,
	currentValues = null,
	openingValues = null,
	hydratedValues = null,
} = {}) {
	const current = asValuesObject(currentValues);
	const opening = asValuesObject(openingValues);
	const next = { ...asValuesObject(hydratedValues) };
	const ownedKeys = locallyOwnedImageMetadataKeys({
		keys: Object.keys(opening),
		focusedProtectedKey,
		currentValues: current,
		referenceValues: opening,
	});
	for (const key of ownedKeys) {
		next[key] = current[key];
	}
	return next;
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
