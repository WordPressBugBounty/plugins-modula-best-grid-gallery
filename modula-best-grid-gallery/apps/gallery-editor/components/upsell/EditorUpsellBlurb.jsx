/**
 * Generic schema-driven upsell: `editorLightboxLiteUpsell`, `editorGalleryTypeUpsell`.
 * Renders when the field schema includes one of these objects; no per-setting React components.
 */

import { __ } from '@wordpress/i18n';
import { Button } from '@wordpress/components';
import {
	getLightboxUpsellExtensionSlugs,
	hasExtensionPlanUpgradeBarrier,
	resolveExtensionUpsellBarrier,
} from '../../logic/proGateLock';
import { useModulaSettingsEditorConfig } from '../../hooks/useModulaSettingsEditorConfig';

/**
 * @param {string} url
 * @param {string} query e.g. a=1&b=2 (no leading ?)
 */
function appendQuery(url, query) {
	if (!query) {
		return url;
	}
	const sep = url.includes('?') ? '&' : '?';
	return `${url}${sep}${query}`;
}

/**
 * @param {{ schema?: object, control?: object }} field Field descriptor; upsell config lives on `field.schema`.
 * @param {string} [wrapperClassName] Optional outer class when the blurb renders (skipped when null).
 */
export default function EditorUpsellBlurb({ field, wrapperClassName = '' }) {
	const editor = useModulaSettingsEditorConfig();
	const schema = field?.schema;
	if (!schema || typeof schema !== 'object') {
		return null;
	}
	const isPro = Boolean(editor.isPro);
	const baseUpgrade =
		typeof editor.upgradeUrl === 'string' && editor.upgradeUrl !== ''
			? editor.upgradeUrl
			: 'https://wp-modula.com/pricing/';

	const lightboxCfg = schema.editorLightboxLiteUpsell;
	const galleryCfg = schema.editorGalleryTypeUpsell;
	const wrapClass =
		typeof wrapperClassName === 'string' ? wrapperClassName.trim() : '';

	const wrap = (node) =>
		wrapClass !== '' ? (
			<div className={wrapClass}>{node}</div>
		) : (
			node
		);

	if (lightboxCfg && typeof lightboxCfg === 'object') {
		const extSlugs = getLightboxUpsellExtensionSlugs(lightboxCfg);
		if (isPro) {
			if (extSlugs.length === 0) {
				return null;
			}
			const { blocked, reason } = resolveExtensionUpsellBarrier(
				extSlugs,
				editor
			);
			if (!blocked || !reason) {
				return null;
			}
			const titleRaw = lightboxCfg.title;
			const title =
				typeof titleRaw === 'string' && titleRaw.trim() !== ''
					? titleRaw.trim()
					: '';
			const msgRaw = lightboxCfg.needsProMessage;
			const message =
				typeof msgRaw === 'string' && msgRaw.trim() !== ''
					? msgRaw.trim()
					: '';
			if (!message) {
				return null;
			}
			const extensionsUrl =
				typeof editor.extensionsAdminUrl === 'string' &&
				editor.extensionsAdminUrl !== ''
					? editor.extensionsAdminUrl
					: '/wp-admin/edit.php?post_type=modula-gallery&page=modula-addons';
			const pricingUrlPro =
				typeof lightboxCfg.pricingUrl === 'string' &&
				lightboxCfg.pricingUrl !== ''
					? lightboxCfg.pricingUrl
					: '';
			const upgradeHrefPro = pricingUrlPro
				? pricingUrlPro
				: appendQuery(
						baseUpgrade,
						'utm_source=modula-pro&utm_medium=settings-editor-extension-upsell&utm_campaign=upgrade'
					);
			const activateLabel =
				typeof lightboxCfg.activateExtensionLabel === 'string' &&
				lightboxCfg.activateExtensionLabel.trim() !== ''
					? lightboxCfg.activateExtensionLabel.trim()
					: /* translators: primary CTA when extension is on plan but disabled */
						__('Activate', 'modula-best-grid-gallery');
			const upgradeLabel =
				typeof lightboxCfg.upgradeSubscriptionLabel === 'string' &&
				lightboxCfg.upgradeSubscriptionLabel.trim() !== ''
					? lightboxCfg.upgradeSubscriptionLabel.trim()
					: /* translators: primary CTA when feature needs a higher plan */
						__('Upgrade', 'modula-best-grid-gallery');
			const primaryIsActivate = reason === 'needs_enable';
			return wrap(
				<div className="modula-settings-editor__editor-upsell">
					{title ? (
						<h3 className="modula-settings-editor__editor-upsell-heading">
							{title}
						</h3>
					) : null}
					<p className="modula-settings-editor__editor-upsell-text">
						{message}
					</p>
					<div className="modula-settings-editor__editor-upsell-actions">
						<Button
							variant="primary"
							href={
								primaryIsActivate
									? extensionsUrl
									: upgradeHrefPro
							}
							target={primaryIsActivate ? undefined : '_blank'}
							rel={
								primaryIsActivate
									? undefined
									: 'noopener noreferrer'
							}
							className="modula-settings-editor__editor-upsell-btn modula-settings-editor__editor-upsell-btn--primary"
						>
							{primaryIsActivate ? activateLabel : upgradeLabel}
						</Button>
					</div>
				</div>
			);
		}
		const titleRaw = lightboxCfg.title;
		const title =
			typeof titleRaw === 'string' && titleRaw.trim() !== ''
				? titleRaw.trim()
				: '';
		const msgRaw = lightboxCfg.needsProMessage;
		const message =
			typeof msgRaw === 'string' && msgRaw.trim() !== ''
				? msgRaw.trim()
				: '';
		if (!message) {
			return null;
		}
		const freeLabel =
			typeof lightboxCfg.freeVsPremiumLabel === 'string'
				? lightboxCfg.freeVsPremiumLabel.trim()
				: '';
		const compareUrl =
			typeof lightboxCfg.compareUrl === 'string' &&
			lightboxCfg.compareUrl !== ''
				? lightboxCfg.compareUrl
				: '';
		const premiumLabel =
			typeof lightboxCfg.getPremiumLabel === 'string' &&
			lightboxCfg.getPremiumLabel.trim() !== ''
				? lightboxCfg.getPremiumLabel.trim()
				: /* translators: primary CTA on Lite lightbox upsell */
					__('Get Premium!', 'modula-best-grid-gallery');
		const pricingUrl =
			typeof lightboxCfg.pricingUrl === 'string' &&
			lightboxCfg.pricingUrl !== ''
				? lightboxCfg.pricingUrl
				: '';
		const upgradeUrl = pricingUrl
			? pricingUrl
			: appendQuery(
					baseUpgrade,
					'utm_source=modula-lite&utm_medium=settings-editor-lightbox&utm_campaign=upsell'
				);
		const showCompare = Boolean(freeLabel && compareUrl);

		return wrap(
			<div className="modula-settings-editor__editor-upsell">
				{title ? (
					<h3 className="modula-settings-editor__editor-upsell-heading">
						{title}
					</h3>
				) : null}
				<p className="modula-settings-editor__editor-upsell-text">
					{message}
				</p>
				<div className="modula-settings-editor__editor-upsell-actions">
					{showCompare ? (
						<Button
							variant="secondary"
							href={compareUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="modula-settings-editor__editor-upsell-btn modula-settings-editor__editor-upsell-btn--secondary"
						>
							{freeLabel}
						</Button>
					) : null}
					<Button
						variant="primary"
						href={upgradeUrl}
						target="_blank"
						rel="noopener noreferrer"
						className="modula-settings-editor__editor-upsell-btn modula-settings-editor__editor-upsell-btn--primary"
					>
						{premiumLabel}
					</Button>
				</div>
			</div>
		);
	}

	if (!galleryCfg || typeof galleryCfg !== 'object') {
		return null;
	}

	const needsProMsg =
		typeof galleryCfg.needsProMessage === 'string' &&
		galleryCfg.needsProMessage.trim() !== ''
			? galleryCfg.needsProMessage.trim()
			: '';
	const needsPlanMsg =
		typeof galleryCfg.needsPlanUpgradeMessage === 'string' &&
		galleryCfg.needsPlanUpgradeMessage.trim() !== ''
			? galleryCfg.needsPlanUpgradeMessage.trim()
			: '';
	const optionGates = field?.control?.optionGates;

	let body = '';
	if (!isPro && needsProMsg) {
		body = needsProMsg;
	} else if (
		isPro &&
		needsPlanMsg &&
		hasExtensionPlanUpgradeBarrier(editor, optionGates)
	) {
		body = needsPlanMsg;
	}

	if (!body) {
		return null;
	}

	const upgradeUrl = appendQuery(
		baseUpgrade,
		'utm_source=modula-lite&utm_medium=settings-editor-gallery-type&utm_campaign=upsell'
	);
	const plansLabel =
		/* translators: primary CTA on gallery type upsell */
		__('View plans', 'modula-best-grid-gallery');

	return wrap(
		<div className="modula-settings-editor__editor-upsell">
			<p className="modula-settings-editor__editor-upsell-text">{body}</p>
			<div className="modula-settings-editor__editor-upsell-actions">
				<Button
					variant="primary"
					href={upgradeUrl}
					target="_blank"
					rel="noopener noreferrer"
					className="modula-settings-editor__editor-upsell-btn modula-settings-editor__editor-upsell-btn--primary"
				>
					{plansLabel}
				</Button>
			</div>
		</div>
	);
}
