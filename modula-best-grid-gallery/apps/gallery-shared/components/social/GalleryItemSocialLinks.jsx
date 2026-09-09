/**
 * Inline / expandable network share links for a gallery item.
 *
 * @package
 */

import { MODULA_SOCIAL_ICON_BY_TYPE } from './ModulaSocialIcons';

/**
 * @param {Object} props
 * @param {string|number} props.itemId
 * @param {Array<{ type: string, label: string, url?: string }>} props.socials
 * @param {number} [props.iconSize]
 * @param {string} [props.className] Extra class on each anchor (unused; type class wins).
 */
export default function GalleryItemSocialLinks({
	itemId,
	socials,
	iconSize = 20,
}) {
	if (!Array.isArray(socials) || socials.length === 0) {
		return null;
	}

	return socials.map((social, idx) => {
		const Icon = MODULA_SOCIAL_ICON_BY_TYPE[social.type];
		return (
			<a
				key={`${itemId}-social-${idx}`}
				className={`modula-icon-${social.type}`}
				aria-label={social.label}
				href={social.url || '#'}
				target={social.type === 'email' ? undefined : '_blank'}
				rel={
					social.type === 'email' ? undefined : 'noopener noreferrer'
				}
				onClick={(event) => {
					/* Keep the full-tile lightbox link from swallowing the share action. */
					event.stopPropagation();
					if (social.type === 'email') {
						return;
					}
					if (social.url && social.url !== '#') {
						event.preventDefault();
						const w = window.open(
							social.url,
							'ftgw',
							'location=1,status=1,scrollbars=1,width=600,height=400'
						);
						if (w) {
							w.moveTo(
								window.screen.width / 2 - 300,
								window.screen.height / 2 - 200
							);
						}
					}
				}}
			>
				{Icon ? <Icon size={iconSize} /> : null}
				<span className="screen-reader-text">{social.label}</span>
			</a>
		);
	});
}
