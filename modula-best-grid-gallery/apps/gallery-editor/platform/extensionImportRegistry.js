/**
 * Registry for takeover extension import flows.
 * Lite keeps entitlement metadata only; Pro bundles register `load` at runtime.
 */
import { resolveProGateLock } from '../logic/proGateLock';

/** @typedef {Record<string, unknown>} ExtensionImportModalProps */

/**
 * @typedef {() => Promise<{ default: import('react').ComponentType<Record<string, unknown>> }>} ExtensionImportLoadFn
 */

/**
 * @typedef {{
 *   id: string,
 *   extensionSlug?: string,
 *   reactFlow: string,
 *   load?: ExtensionImportLoadFn,
 *   modalProps?: ExtensionImportModalProps,
 *   source?: 'lite' | 'pro',
 * }} ExtensionImportRegistryEntry
 */

/** @type {Map<string, ExtensionImportRegistryEntry>} */
const registryById = new Map();

/** @type {Map<string, ExtensionImportRegistryEntry>} */
const registryByReactFlow = new Map();

/**
 * @param {ExtensionImportRegistryEntry} entry
 */
export function registerExtensionImport(entry) {
	if (!entry?.id || !entry.reactFlow) {
		return;
	}

	const normalized = {
		source: 'lite',
		...entry,
	};

	registryById.set(normalized.id, normalized);
	registryByReactFlow.set(normalized.reactFlow, normalized);
}

/**
 * @param {string} id
 * @return {ExtensionImportRegistryEntry | undefined}
 */
export function getExtensionImportEntry(id) {
	return registryById.get(id);
}

/**
 * @param {string} reactFlow
 * @return {ExtensionImportRegistryEntry | undefined}
 */
export function getExtensionImportEntryByReactFlow(reactFlow) {
	return registryByReactFlow.get(reactFlow);
}

/**
 * @return {ExtensionImportRegistryEntry[]}
 */
export function listExtensionImportEntries() {
	return Array.from(registryById.values());
}

/**
 * @param {ExtensionImportRegistryEntry} entry
 * @param {{ isPro?: boolean, extensionEntitlements?: Record<string, { available?: boolean, enabled?: boolean }> }} editor
 * @return {boolean}
 */
export function isExtensionImportEntitled(entry, editor) {
	if (!editor?.isPro || !entry) {
		return false;
	}
	if (!entry.extensionSlug) {
		return true;
	}
	return resolveProGateLock(
		{ kind: 'requiresExtension', extensionSlug: entry.extensionSlug },
		editor
	).allowed;
}

/**
 * Ask the takeover preview chrome to open an extension import flow.
 * Sidebar fields sit outside ExtensionImportHostProvider, so they dispatch this event.
 *
 * @param {string} reactFlow
 */
export function requestExtensionImportOpen(reactFlow) {
	if (typeof reactFlow !== 'string' || reactFlow.trim() === '') {
		return;
	}
	if (typeof window === 'undefined') {
		return;
	}
	window.dispatchEvent(
		new CustomEvent('modulaExtensionImportRequestOpen', {
			detail: { reactFlow: reactFlow.trim() },
		})
	);
}

// Metadata stubs only — Pro registers `load` via window.modula.extensionImport.register.
registerExtensionImport({
	id: 'instagram',
	extensionSlug: 'modula-instagram',
	reactFlow: 'instagram',
});

registerExtensionImport({
	id: 'content-galleries',
	extensionSlug: 'modula-content-galleries',
	reactFlow: 'content-galleries',
});

registerExtensionImport({
	id: 'video',
	extensionSlug: 'modula-video',
	reactFlow: 'video',
	modalProps: { mode: 'single' },
});

registerExtensionImport({
	id: 'video-playlist',
	extensionSlug: 'modula-video',
	reactFlow: 'video-playlist',
	modalProps: { mode: 'playlist' },
});
