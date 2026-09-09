/**
 * Expandable share FAB + network popover (collapsed / mobile listing UX).
 *
 * @package
 */

import { __ } from '@wordpress/i18n';
import { ModulaSocialSvgShare } from './ModulaSocialIcons';
import GalleryItemSocialLinks from './GalleryItemSocialLinks';
import { useExpandableSocials } from '../../hooks/useExpandableSocials';

/**
 * @param {Object} props
 * @param {string|number} props.itemId
 * @param {Array<{ type: string, label: string, url?: string }>} props.socials
 * @param {boolean} props.desktopCollapsed - Adds modula-social-desktop-collapsed.
 * @param {number} [props.iconSize]
 */
export default function GalleryItemExpandableSocials({
	itemId,
	socials,
	desktopCollapsed,
	iconSize = 20,
}) {
	const { open, flipRight, fabRef, iconsRef, onFabClick } =
		useExpandableSocials();

	if (!Array.isArray(socials) || socials.length === 0) {
		return null;
	}

	const collapsedClass = desktopCollapsed
		? 'modula-social-desktop-collapsed'
		: '';

	return (
		<>
			<div
				ref={fabRef}
				className={['modula-social-expandable', collapsedClass]
					.filter(Boolean)
					.join(' ')}
				onClick={onFabClick}
				onKeyDown={(event) => {
					if (event.key === 'Enter' || event.key === ' ') {
						onFabClick(event);
					}
				}}
				role="button"
				tabIndex={0}
				aria-expanded={open}
				aria-label={__(
					'Click to share',
					'modula-best-grid-gallery'
				)}
			>
				<a
					className="modula-icon-share"
					href="#"
					tabIndex={-1}
					aria-hidden="true"
					onClick={(event) => {
						event.preventDefault();
					}}
				>
					<ModulaSocialSvgShare size={iconSize} />
				</a>
			</div>
			<div
				ref={iconsRef}
				className={[
					'modula-social-expandable-icons',
					collapsedClass,
					open ? 'modula-show-socials' : '',
					flipRight ? 'modula-socials-right' : '',
				]
					.filter(Boolean)
					.join(' ')}
			>
				<GalleryItemSocialLinks
					itemId={itemId}
					socials={socials}
					iconSize={iconSize}
				/>
			</div>
		</>
	);
}
