/**
 * Standalone entitlement for listing View on site.
 * Reuses the gallery editor Pro-lock resolver and entitlement shape.
 */

import { resolveProGateLock } from '../gallery-editor/logic/proGateLock';

export const STANDALONE_EXTENSION_SLUG = 'modula-standalone';

const STANDALONE_GATE = {
	kind: 'requiresExtension',
	extensionSlug: STANDALONE_EXTENSION_SLUG,
};

/**
 * @param {{
 *   isPro?: boolean,
 *   extensionEntitlements?: Record<string, { available?: boolean, enabled?: boolean }>,
 * }} editor
 * @return {boolean}
 */
export function isStandaloneEntitled(editor) {
	return resolveProGateLock(STANDALONE_GATE, editor || {}).allowed === true;
}

/**
 * @param {{
 *   isPro?: boolean,
 *   extensionEntitlements?: Record<string, { available?: boolean, enabled?: boolean }>,
 *   upgradeUrl?: string,
 *   standaloneUpsellUrl?: string,
 *   extensionsAdminUrl?: string,
 * }} editor
 * @param {string} viewUrl
 * @return {{ type: 'permalink'|'upsell', url: string }}
 */
export function getViewOnSiteClickTarget(editor, viewUrl) {
	const config = editor || {};
	const lock = resolveProGateLock(STANDALONE_GATE, config);
	if (lock.allowed) {
		return {
			type: 'permalink',
			url: typeof viewUrl === 'string' ? viewUrl : '',
		};
	}

	if (
		lock.reason === 'needs_enable' &&
		typeof config.extensionsAdminUrl === 'string' &&
		config.extensionsAdminUrl
	) {
		return { type: 'upsell', url: config.extensionsAdminUrl };
	}

	const upsell =
		(typeof config.standaloneUpsellUrl === 'string' &&
			config.standaloneUpsellUrl) ||
		(typeof config.upgradeUrl === 'string' && config.upgradeUrl) ||
		'';

	return { type: 'upsell', url: upsell };
}
