/**
 * Which Add media dialog sources are usable, from today's entitlement
 * sources (never the plan name), and where a locked one sends the user.
 */
import { appendQuery, withV3Utm } from 'gallery-shared/utils/withV3Utm';
import { resolveProGateLock } from '../../logic/proGateLock';

const VIDEO_EXTENSION = 'modula-video';
const DEFAULT_PRICING_URL = 'https://wp-modula.com/pricing/';

/**
 * @param {Record<string, unknown>} editor
 * @return {string} The editor's pricing link.
 */
function pricingUrl(editor) {
	return typeof editor.upgradeUrl === 'string' && editor.upgradeUrl !== ''
		? editor.upgradeUrl
		: DEFAULT_PRICING_URL;
}

/**
 * @typedef {{ available: true } | {
 *   available: false,
 *   reason: import('../../logic/proGateLock').GateLockReason,
 *   upsellHref: string,
 * }} VideoLinkAvailability
 */

/**
 * The Video link tab adds through the Video extension's import flow. A
 * disabled extension sends the user to the extensions page, as the editor's
 * extension upsells do; Lite and a plan without Video go to pricing.
 *
 * @param {Record<string, unknown>} editor Editor config.
 * @return {VideoLinkAvailability} Availability, or the lock and its upsell.
 */
export function resolveVideoLinkAvailability(editor) {
	const { allowed, reason } = resolveProGateLock(
		{ kind: 'requiresExtension', extensionSlug: VIDEO_EXTENSION },
		editor
	);
	if (allowed) {
		return { available: true };
	}
	if (
		reason === 'needs_enable' &&
		typeof editor.extensionsAdminUrl === 'string'
	) {
		return {
			available: false,
			reason,
			upsellHref: editor.extensionsAdminUrl,
		};
	}
	const source = editor.isPro ? 'modula-pro' : 'modula-lite';

	return {
		available: false,
		reason,
		upsellHref: withV3Utm(
			appendQuery(
				pricingUrl(editor),
				`utm_source=${source}&utm_medium=add-media-video-link&utm_campaign=upgrade`
			)
		),
	};
}
