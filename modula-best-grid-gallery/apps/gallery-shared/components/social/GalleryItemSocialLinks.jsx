/**
 * Inline / expandable network share links for a gallery item.
 *
 * @package
 */

import { MODULA_SOCIAL_ICON_BY_TYPE } from './ModulaSocialIcons';

/**
 * @param {Object}        props
 * @param {string|number} props.itemId
 * @param {Array<{ type: string, label: string, url?: string }>} props.socials
 * @param {number}        [props.iconSize]
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
		const isDownload = social.type === 'download';
		const isEmail = social.type === 'email';
		const className = isDownload
			? 'modula-download-button'
			: `modula-icon-${social.type}`;
		let target;
		if (isDownload) {
			target = '_self';
		} else if (!isEmail) {
			target = '_blank';
		}
		return (
			<a
				key={`${itemId}-social-${idx}`}
				className={className}
				aria-label={social.label}
				title={isDownload ? social.label : undefined}
				href={social.url || '#'}
				target={target}
				rel={isDownload || isEmail ? undefined : 'noopener noreferrer'}
				{...(isDownload ? { download: '' } : {})}
				onClick={(event) => {
					/* Keep the full-tile lightbox link from swallowing the share action. */
					event.stopPropagation();
					if (isDownload || isEmail) {
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
