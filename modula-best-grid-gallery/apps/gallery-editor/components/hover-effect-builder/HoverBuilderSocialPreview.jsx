/**
 * Social strip for hover builder preview — mirrors front markup/classes.
 */
import {
	ModulaSocialSvgEmail,
	ModulaSocialSvgFacebook,
	ModulaSocialSvgLinkedin,
	ModulaSocialSvgPinterest,
	ModulaSocialSvgShare,
	ModulaSocialSvgTwitter,
	ModulaSocialSvgWhatsapp,
} from 'gallery-shared/preview';
import { __ } from '@wordpress/i18n';

const SOCIAL_PREVIEW_DEFS = [
	{
		flag: 'enableTwitter',
		key: 'tw',
		className: 'modula-icon-twitter',
		label: __('Share on X', 'modula-best-grid-gallery'),
		Icon: ModulaSocialSvgTwitter,
	},
	{
		flag: 'enableFacebook',
		key: 'fb',
		className: 'modula-icon-facebook',
		label: __('Share on Facebook', 'modula-best-grid-gallery'),
		Icon: ModulaSocialSvgFacebook,
	},
	{
		flag: 'enableWhatsapp',
		key: 'wa',
		className: 'modula-icon-whatsapp',
		label: __('Share on Whatsapp', 'modula-best-grid-gallery'),
		Icon: ModulaSocialSvgWhatsapp,
	},
	{
		flag: 'enablePinterest',
		key: 'pi',
		className: 'modula-icon-pinterest',
		label: __('Share on Pinterest', 'modula-best-grid-gallery'),
		Icon: ModulaSocialSvgPinterest,
	},
	{
		flag: 'enableLinkedin',
		key: 'li',
		className: 'modula-icon-linkedin',
		label: __('Share on LinkedIn', 'modula-best-grid-gallery'),
		Icon: ModulaSocialSvgLinkedin,
	},
	{
		flag: 'enableEmail',
		key: 'em',
		className: 'modula-icon-email',
		label: __('Share by Email', 'modula-best-grid-gallery'),
		Icon: ModulaSocialSvgEmail,
	},
];

/**
 * @param {unknown} value
 * @param {number} fallback
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function normalizeNumericSetting(value, fallback, min, max) {
	const n = Number(value);
	if (!Number.isFinite(n)) {
		return fallback;
	}
	return Math.min(max, Math.max(min, Math.round(n)));
}

/**
 * @param {{ social: Record<string, unknown> | null | undefined }} props
 */
export default function HoverBuilderSocialPreview({ social }) {
	const color =
		typeof social?.socialIconColor === 'string'
			? social.socialIconColor.trim()
			: '#ffffff';
	const size = normalizeNumericSetting(social?.socialIconSize, 16, 12, 28);
	const pad = normalizeNumericSetting(social?.socialIconPadding, 10, 0, 500);
	const items = SOCIAL_PREVIEW_DEFS.filter(
		(def) => social?.[def.flag] === true
	);

	const showFallback = items.length === 0;

	return (
		<div
			className="modula-social modula-hover-builder-card__social-preview"
			style={{
				color,
				gap: `${pad}px`,
			}}
		>
			{items.map(({ key, className, label, Icon: Svg }) => (
				<button
					type="button"
					key={key}
					className={className}
					aria-label={label}
					tabIndex={-1}
				>
					<Svg size={size} />
				</button>
			))}
			{showFallback ? (
				<button
					type="button"
					className="modula-icon-share modula-hover-builder-card__social-preview-fallback"
					aria-label={__(
						'Enable at least one network in Social settings',
						'modula-best-grid-gallery'
					)}
					tabIndex={-1}
				>
					<ModulaSocialSvgShare size={size} />
				</button>
			) : null}
		</div>
	);
}
