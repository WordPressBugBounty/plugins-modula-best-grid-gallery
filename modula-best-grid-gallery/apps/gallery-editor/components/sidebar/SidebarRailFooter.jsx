/**
 * Rail footer — Documentation link + appearance toggle (icon + short label).
 */
import { __ } from '@wordpress/i18n';
import { Tooltip } from '@wordpress/components';
import { Icon, external } from '@wordpress/icons';
import AppearanceToggle from '../shell/AppearanceToggle';

/**
 * @param {Object} props
 * @param {string} [props.docsUrl]
 */
export default function SidebarRailFooter({ docsUrl = '' }) {
	const docsLabel = __('Documentation', 'modula-best-grid-gallery');
	const docsShortLabel = __('Help', 'modula-best-grid-gallery');

	return (
		<div className="modula-gallery-takeover__sidebar-rail-footer">
			{docsUrl ? (
				<Tooltip text={docsLabel} delay={0}>
					<a
						className="modula-gallery-takeover__sidebar-rail-footer-docs"
						href={docsUrl}
						target="_blank"
						rel="noopener noreferrer"
						aria-label={docsLabel}
					>
						<Icon icon={external} size={16} aria-hidden="true" />
						<span
							className="modula-gallery-takeover__sidebar-rail-footer-docs-label"
							aria-hidden="true"
						>
							{docsShortLabel}
						</span>
					</a>
				</Tooltip>
			) : (
				<span className="modula-gallery-takeover__sidebar-rail-footer-docs-spacer" />
			)}
			<AppearanceToggle variant="sidebar-footer" />
		</div>
	);
}
