/**
 * Rail footer — Documentation link + appearance toggle (redesign mockup).
 */
import { __ } from '@wordpress/i18n';
import { Icon, external } from '@wordpress/icons';
import AppearanceToggle from '../shell/AppearanceToggle';

/**
 * @param {Object} props
 * @param {string} [props.docsUrl]
 */
export default function SidebarRailFooter({ docsUrl = '' }) {
	return (
		<div className="modula-gallery-takeover__sidebar-rail-footer">
			{docsUrl ? (
				<a
					className="modula-gallery-takeover__sidebar-rail-footer-docs"
					href={docsUrl}
					target="_blank"
					rel="noopener noreferrer"
				>
					{__('Documentation', 'modula-best-grid-gallery')}
					<Icon icon={external} size={14} aria-hidden="true" />
				</a>
			) : (
				<span className="modula-gallery-takeover__sidebar-rail-footer-docs-spacer" />
			)}
			<AppearanceToggle variant="sidebar-footer" />
		</div>
	);
}
