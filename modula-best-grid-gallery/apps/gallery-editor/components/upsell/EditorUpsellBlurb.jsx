/**
 * Generic schema-driven upsell: `editorLightboxLiteUpsell`, `editorGalleryTypeUpsell`.
 * Renders when the field schema includes one of these objects; no per-setting React components.
 */

import { __ } from '@wordpress/i18n';
import { Button } from 'admin-ui';
import { AdminUiScope } from 'editor-shell';
import {
	getLightboxUpsellExtensionSlugs,
	hasExtensionPlanUpgradeBarrier,
	resolveExtensionUpsellBarrier,
} from '../../logic/proGateLock';
import { resolveLiteUpsell } from '../../logic/liteUpsell';
import { useModulaSettingsEditorConfig } from '../../hooks/useModulaSettingsEditorConfig';
import { appendQuery, withV3Utm } from 'gallery-shared/utils/withV3Utm';

/**
 * @param {{ schema?: object, control?: object }} field              Field descriptor; upsell config lives on `field.schema`.
 * @param {string}                                [wrapperClassName] Optional outer class when the blurb renders (skipped when null).
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
		wrapClass !== '' ? <div className={wrapClass}>{node}</div> : node;

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
			const upgradeHrefPro = withV3Utm(
				pricingUrlPro
					? pricingUrlPro
					: appendQuery(
							baseUpgrade,
							'utm_source=modula-pro&utm_medium=settings-editor-extension-upsell&utm_campaign=upgrade'
						)
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
				<BlurbCard title={title} message={message}>
					{primaryIsActivate ? (
						<BlurbLink variant="primary" href={extensionsUrl}>
							{activateLabel}
						</BlurbLink>
					) : (
						<BlurbLink
							variant="primary"
							href={upgradeHrefPro}
							newTab
						>
							{upgradeLabel}
						</BlurbLink>
					)}
				</BlurbCard>
			);
		}
		const upsell = resolveLiteUpsell(schema, editor);
		if (!upsell) {
			return null;
		}
		const freeLabel =
			typeof lightboxCfg.freeVsPremiumLabel === 'string'
				? lightboxCfg.freeVsPremiumLabel.trim()
				: '';
		const compareUrl =
			typeof lightboxCfg.compareUrl === 'string' &&
			lightboxCfg.compareUrl !== ''
				? withV3Utm(lightboxCfg.compareUrl)
				: '';
		const showCompare = Boolean(freeLabel && compareUrl);

		return wrap(
			<BlurbCard title={upsell.title} message={upsell.message}>
				{showCompare ? (
					<BlurbLink variant="secondary" href={compareUrl} newTab>
						{freeLabel}
					</BlurbLink>
				) : null}
				<BlurbLink variant="primary" href={upsell.href} newTab>
					{upsell.ctaLabel}
				</BlurbLink>
			</BlurbCard>
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

	const upgradeUrl = withV3Utm(
		appendQuery(
			baseUpgrade,
			'utm_source=modula-lite&utm_medium=settings-editor-gallery-type&utm_campaign=upsell'
		)
	);
	const plansLabel =
		/* translators: primary CTA on gallery type upsell */
		__('View plans', 'modula-best-grid-gallery');

	return wrap(
		<BlurbCard message={body}>
			<BlurbLink variant="primary" href={upgradeUrl} newTab>
				{plansLabel}
			</BlurbLink>
		</BlurbCard>
	);
}

/**
 * The blurb in the Lite upsell card's look (`LiteUpsellCard`): an optional
 * heading, the message, then the calls to action stacked full width.
 *
 * @param {Object}                    props
 * @param {string}                    [props.title]
 * @param {string}                    props.message
 * @param {import('react').ReactNode} props.children The BlurbLinks.
 */
function BlurbCard({ title = '', message, children }) {
	return (
		<AdminUiScope>
			<div className="modula-lite-upsell is-blurb">
				{title ? (
					<h3 className="modula-lite-upsell__heading">{title}</h3>
				) : null}
				<p className="modula-lite-upsell__message">{message}</p>
				<div className="modula-lite-upsell__actions">{children}</div>
			</div>
		</AdminUiScope>
	);
}

/**
 * @param {Object}                    props
 * @param {'primary'|'secondary'}     props.variant
 * @param {string}                    props.href
 * @param {boolean}                   [props.newTab] Opens in a new tab, and says so to screen readers.
 * @param {import('react').ReactNode} props.children
 */
function BlurbLink({ variant, href, newTab = false, children }) {
	return (
		<Button
			variant={variant}
			href={href}
			target={newTab ? '_blank' : undefined}
			rel={newTab ? 'noopener noreferrer' : undefined}
			className="modula-lite-upsell__cta"
		>
			{children}
			{newTab ? (
				<span className="modula-admin-sr-only">
					{__('(opens in a new tab)', 'modula-best-grid-gallery')}
				</span>
			) : null}
		</Button>
	);
}
