/**
 * Takeover sidebar — category rail column + settings panel column.
 */
import { __ } from '@wordpress/i18n';

/**
 * @param {Object}                    props
 * @param {import('react').ReactNode} props.rail     Category rail (usually `SidebarRailNav`).
 * @param {import('react').ReactNode} props.children Settings panel for the active category.
 */
export default function TakeoverSidebar({ rail, children }) {
	return (
		<aside
			className="modula-takeover__sidebar modula-takeover__sidebar--v2"
			aria-label={__('Settings', 'modula-best-grid-gallery')}
		>
			<div className="modula-takeover__sidebar-body modula-takeover__sidebar-body--v2">
				<div className="modula-takeover__sidebar-v2-columns">
					<div className="modula-takeover__sidebar-v2-nav-column">
						{rail}
					</div>
					<div className="modula-takeover__sidebar-v2-settings-column">
						{children}
					</div>
				</div>
			</div>
		</aside>
	);
}
