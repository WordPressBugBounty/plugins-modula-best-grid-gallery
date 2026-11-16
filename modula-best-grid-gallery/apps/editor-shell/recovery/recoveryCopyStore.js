/**
 * Recovery copy store (ADR 0059): this browser's copy of one document's
 * unsaved changes, kept in `localStorage` for recovery only. The editor never
 * reads its working state from here.
 *
 * Document-agnostic: a gallery and an album use it the same way. The caller
 * supplies the document identity and an opaque, JSON-serializable payload.
 * Storage failures never reach the caller as errors: a recovery copy is a
 * convenience, and a full or blocked storage must not stop editing or saving.
 */

/**
 * @typedef {Object} RecoveryDocumentIdentity
 * @property {string|number} site         The site the document belongs to, so
 *                                        sites sharing an origin stay apart.
 * @property {string|number} user         The editing user, so users sharing a
 *                                        browser profile stay apart.
 * @property {string}        documentType For example `gallery` or `album`.
 * @property {string|number} documentId   The document's post ID.
 */

/**
 * Marker of the saved state a copy was based on, compared strictly. `null`
 * stands for a document that has never been saved.
 *
 * @typedef {string|number|null} SavedStateMarker
 */

/**
 * @typedef {Object} RecoveryCopy
 * @property {*}                payload        The unsaved state as written.
 * @property {SavedStateMarker} savedMarker    Saved state the copy was based on.
 * @property {boolean}          savedElsewhere Whether the document has been
 *                                             saved since the copy was made.
 */

const KEY_PREFIX = 'modula-recovery-copy:';

/** Raise when the stored shape changes; copies in any other shape are discarded. */
const SHAPE_VERSION = 1;

/**
 * @param {unknown} value
 * @return {boolean} Whether the value is a non-empty string or a finite number.
 */
function isIdentifier(value) {
	return (
		(typeof value === 'string' && value !== '') ||
		(typeof value === 'number' && Number.isFinite(value))
	);
}

/**
 * JSON of the identity parts keeps them apart even when a part contains the
 * separator another key shape would use. Site and user are optional; the
 * document type and id are required, so copies never share a key by accident.
 *
 * @param {RecoveryDocumentIdentity} identity
 * @return {string|null} The `localStorage` key of the document's copy, or null
 * when the identity does not name a document.
 */
function storageKey(identity) {
	if (
		!isIdentifier(identity?.documentType) ||
		!isIdentifier(identity?.documentId)
	) {
		return null;
	}
	return (
		KEY_PREFIX +
		JSON.stringify([
			identity.site,
			identity.user,
			identity.documentType,
			identity.documentId,
		])
	);
}

/**
 * Reading `window.localStorage` itself throws where storage is blocked.
 *
 * @return {Storage|null} The storage, or null when it cannot be reached.
 */
function reachStorage() {
	try {
		return window.localStorage ?? null;
	} catch {
		return null;
	}
}

/**
 * @param {unknown} copy Parsed stored value.
 * @return {boolean} Whether it is a copy in the current shape.
 */
function isCurrentShape(copy) {
	return (
		copy !== null &&
		typeof copy === 'object' &&
		copy.version === SHAPE_VERSION &&
		Object.hasOwn(copy, 'payload') &&
		Object.hasOwn(copy, 'savedMarker')
	);
}

/**
 * @param {string} raw Stored text.
 * @return {Object|null} The copy in the current shape, or null when unusable.
 */
function parseCopy(raw) {
	try {
		const copy = JSON.parse(raw);
		return isCurrentShape(copy) ? copy : null;
	} catch {
		return null;
	}
}

/**
 * Stores the document's one recovery copy, replacing any earlier one.
 *
 * @param {RecoveryDocumentIdentity} identity
 * @param {Object}                   copy
 * @param {*}                        copy.payload     JSON-serializable unsaved state.
 * @param {SavedStateMarker}         copy.savedMarker Saved state it is based on.
 * @return {{stored: boolean}} `stored: false` when the copy could not be kept
 * (quota, storage blocked, payload not serializable).
 */
export function writeRecoveryCopy(identity, { payload, savedMarker }) {
	const key = storageKey(identity);
	const storage = key ? reachStorage() : null;
	if (!storage) {
		return { stored: false };
	}
	try {
		storage.setItem(
			key,
			JSON.stringify({
				version: SHAPE_VERSION,
				savedMarker: savedMarker ?? null,
				payload,
			})
		);
		return { stored: true };
	} catch {
		return { stored: false };
	}
}

/**
 * Reads the document's recovery copy. A copy that cannot be parsed or is in
 * another shape is removed and reported as no copy.
 *
 * @param {RecoveryDocumentIdentity} identity
 * @param {SavedStateMarker}         currentMarker The document's saved state now.
 * @return {RecoveryCopy|null} The copy, or null when there is none to offer.
 */
export function readRecoveryCopy(identity, currentMarker) {
	const key = storageKey(identity);
	const storage = key ? reachStorage() : null;
	if (!storage) {
		return null;
	}
	let raw;
	try {
		raw = storage.getItem(key);
	} catch {
		return null;
	}
	if (raw === null) {
		return null;
	}
	const copy = parseCopy(raw);
	if (!copy) {
		removeRecoveryCopy(identity);
		return null;
	}
	return {
		payload: copy.payload,
		savedMarker: copy.savedMarker,
		savedElsewhere: copy.savedMarker !== (currentMarker ?? null),
	};
}

/**
 * Removes the document's recovery copy, if any. Storage failures are ignored.
 *
 * @param {RecoveryDocumentIdentity} identity
 */
export function removeRecoveryCopy(identity) {
	const key = storageKey(identity);
	if (!key) {
		return;
	}
	try {
		reachStorage()?.removeItem(key);
	} catch {
		// Blocked storage: there is no copy this store could remove.
	}
}
