/**
 * Registry for Instagram settings-editor UI (Pro registers at runtime).
 */

/** @typedef {import('react').ComponentType<Record<string, unknown>>} InstagramSlotComponent */

/**
 * @typedef {{
 *   AccountPanel?: InstagramSlotComponent,
 * }} InstagramEditorRegistration
 */

/** @type {InstagramEditorRegistration|null} */
let registration = null;

/** @type {'unknown' | 'connected' | 'disconnected'} */
let connectionState = 'unknown';

/**
 * @param {InstagramEditorRegistration} entry
 */
export function registerInstagramEditor(entry) {
	if (!entry || typeof entry !== 'object') {
		return;
	}
	registration = { ...entry };
	if (typeof window !== 'undefined') {
		window.dispatchEvent(new CustomEvent('modulaInstagramRegistered'));
	}
}

/**
 * @returns {InstagramEditorRegistration|null}
 */
export function getInstagramEditorRegistration() {
	return registration;
}

/**
 * @param {'unknown' | 'connected' | 'disconnected'} state
 */
export function setInstagramConnectionState(state) {
	if (
		state !== 'unknown' &&
		state !== 'connected' &&
		state !== 'disconnected'
	) {
		return;
	}
	connectionState = state;
	if (typeof window !== 'undefined') {
		window.dispatchEvent(
			new CustomEvent('modulaInstagramConnectionChanged')
		);
	}
}

/**
 * @returns {'unknown' | 'connected' | 'disconnected'}
 */
export function getInstagramConnectionState() {
	return connectionState;
}
