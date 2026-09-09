/**
 * Pro / extension gating for settings editor (gallery type and similar).
 */

import { __ } from '@wordpress/i18n';

/**
 * @typedef {'needs_pro'|'needs_plan_upgrade'|'needs_enable'} GateLockReason
 */

/**
 * Uses `extensionEntitlements` from PHP (Extensions::get_extensions) when Pro; falls back for Lite.
 *
 * @param {{ kind?: string, extensionSlug?: string }|null|undefined}                                                                                 gate
 * @param {{ isPro?: boolean, activeExtensionSlugs?: string[], extensionEntitlements?: Record<string, { available?: boolean, enabled?: boolean }> }} editor From {@link ../config/modulaSettingsEditorConfig.js~getModulaSettingsEditorConfig}
 * @return {{ allowed: boolean, reason?: GateLockReason }} Allow/deny for the gate; `reason` when disallowed.
 */
export function resolveProGateLock(gate, editor) {
	if (!gate || !gate.kind) {
		return { allowed: true };
	}
	if (gate.kind === 'requiresPro') {
		if (editor.isPro) {
			return { allowed: true };
		}
		return { allowed: false, reason: 'needs_pro' };
	}
	if (gate.kind === 'requiresExtension' && gate.extensionSlug) {
		if (!editor.isPro) {
			return { allowed: false, reason: 'needs_pro' };
		}
		const ent = editor.extensionEntitlements?.[gate.extensionSlug];
		if (!ent) {
			return { allowed: false, reason: 'needs_plan_upgrade' };
		}
		if (!ent.available) {
			return { allowed: false, reason: 'needs_plan_upgrade' };
		}
		if (!ent.enabled) {
			return { allowed: false, reason: 'needs_enable' };
		}
		return { allowed: true };
	}
	return { allowed: true };
}

/**
 * Extension slugs wired on `editorLightboxLiteUpsell` (extensionSlug or extensionSlugs).
 *
 * @param {Record<string, unknown>|null|undefined} lightboxCfg
 * @return {string[]} Slugs referenced by the lightbox upsell config.
 */
export function getLightboxUpsellExtensionSlugs(lightboxCfg) {
	if (!lightboxCfg || typeof lightboxCfg !== 'object') {
		return [];
	}
	if (Array.isArray(lightboxCfg.extensionSlugs)) {
		return lightboxCfg.extensionSlugs.filter(
			(s) => typeof s === 'string' && s.trim() !== ''
		);
	}
	if (
		typeof lightboxCfg.extensionSlug === 'string' &&
		lightboxCfg.extensionSlug.trim() !== ''
	) {
		return [lightboxCfg.extensionSlug.trim()];
	}
	return [];
}

/**
 * For Pro + schema-driven lightbox upsells: blocked when any mapped extension is not usable.
 * Plan upgrade wins if any slug requires it; otherwise "activate" if any is available but off.
 *
 * @param {string[]}                                                                                                slugs
 * @param {{ isPro?: boolean, extensionEntitlements?: Record<string, { available?: boolean, enabled?: boolean }> }} editor
 * @return {{ blocked: boolean, reason?: GateLockReason }} Whether to block and strongest reason across slugs.
 */
export function resolveExtensionUpsellBarrier(slugs, editor) {
	if (!editor?.isPro || !Array.isArray(slugs) || slugs.length === 0) {
		return { blocked: false };
	}
	let needsUpgrade = false;
	let needsEnable = false;
	for (const slug of slugs) {
		const { reason } = resolveProGateLock(
			{ kind: 'requiresExtension', extensionSlug: slug },
			editor
		);
		if (reason === 'needs_plan_upgrade') {
			needsUpgrade = true;
		} else if (reason === 'needs_enable') {
			needsEnable = true;
		}
	}
	if (needsUpgrade) {
		return { blocked: true, reason: 'needs_plan_upgrade' };
	}
	if (needsEnable) {
		return { blocked: true, reason: 'needs_enable' };
	}
	return { blocked: false };
}

/**
 * True when Lite (or Pro without the mapped extension) should hide the control and show upsell only.
 *
 * @param {Record<string, unknown>|null|undefined}                                                                                                schemaObj
 * @param {{ isPro?: boolean, extensionEntitlements?: Record<string, { available?: boolean, enabled?: boolean }> }} editor
 * @return {boolean}
 */
export function resolveOmitControlInLite(schemaObj, editor) {
	if (!schemaObj || schemaObj.editorOmitControlInLite !== true) {
		return false;
	}
	const lightboxUpsellCfg = schemaObj.editorLightboxLiteUpsell;
	const extensionUpsellSlugs = getLightboxUpsellExtensionSlugs(
		typeof lightboxUpsellCfg === 'object' ? lightboxUpsellCfg : null
	);
	const extensionUpsellBarrier = resolveExtensionUpsellBarrier(
		extensionUpsellSlugs,
		editor
	);
	return !editor?.isPro || extensionUpsellBarrier.blocked;
}

/**
 * Nested drill panels pass `nestedUpsellGroupedPath` for a panel-level upsell. Skip rendering
 * that field as a row when the upsell is active so the toggle + upsell are not duplicated.
 *
 * @param {{ groupedPath?: string, schema?: object }} field
 * @param {{ nestedUpsellGroupedPath?: string }}      frame
 * @param {{ isPro?: boolean, extensionEntitlements?: Record<string, { available?: boolean, enabled?: boolean }> }} editor
 * @return {boolean}
 */
export function shouldHideFieldForPanelUpsell(field, frame, editor) {
	const nestedUpsellPath =
		typeof frame?.nestedUpsellGroupedPath === 'string'
			? frame.nestedUpsellGroupedPath.trim()
			: '';
	if (
		!nestedUpsellPath ||
		typeof field?.groupedPath !== 'string' ||
		field.groupedPath !== nestedUpsellPath
	) {
		return false;
	}
	const schemaObj =
		field.schema && typeof field.schema === 'object' ? field.schema : null;
	if (!schemaObj?.editorLightboxLiteUpsell) {
		return false;
	}
	const extensionUpsellSlugs = getLightboxUpsellExtensionSlugs(
		schemaObj.editorLightboxLiteUpsell
	);
	const { blocked } = resolveExtensionUpsellBarrier(extensionUpsellSlugs, editor);
	return !editor?.isPro || blocked;
}

/**
 * @param {GateLockReason|undefined} reason
 * @return {string} Short translated hint for UI (empty when no reason).
 */
export function gateLockHint(reason) {
	switch (reason) {
		case 'needs_pro':
			return __('(Pro required)', 'modula-best-grid-gallery');
		case 'needs_plan_upgrade':
			return __('(Upgrade subscription)', 'modula-best-grid-gallery');
		case 'needs_enable':
			return __('(Enable extension)', 'modula-best-grid-gallery');
		default:
			return '';
	}
}

/**
 * True when some extension-gated option is blocked because the plan does not include it (not merely disabled).
 *
 * @param {{ isPro?: boolean, extensionEntitlements?: Record<string, { available?: boolean, enabled?: boolean }> }} editor
 * @param {Record<string, { kind?: string, extensionSlug?: string }>|null|undefined}                                optionGates
 * @return {boolean} True when any gated option needs a higher plan (not merely disabled).
 */
export function hasExtensionPlanUpgradeBarrier(editor, optionGates) {
	if (!editor?.isPro || !optionGates || typeof optionGates !== 'object') {
		return false;
	}
	for (const gate of Object.values(optionGates)) {
		if (!gate || gate.kind !== 'requiresExtension') {
			continue;
		}
		const { reason } = resolveProGateLock(gate, editor);
		if (reason === 'needs_plan_upgrade') {
			return true;
		}
	}
	return false;
}
