/**
 * Device pill floating at the bottom centre of the canvas ("Preview on"):
 * Desktop, Tablet and Mobile preview. The editor owns the viewport state.
 */
import { __ } from '@wordpress/i18n';
import { Icon } from '@wordpress/icons';
import { desktopIcon, phoneIcon, tabletIcon } from './canvasIcons';

const VIEWPORTS = /** @type {const} */ ([
	{
		id: 'desktop',
		icon: desktopIcon,
		label: __('Desktop preview', 'modula-best-grid-gallery'),
	},
	{
		id: 'tablet',
		icon: tabletIcon,
		label: __('Tablet preview', 'modula-best-grid-gallery'),
	},
	{
		id: 'mobile',
		icon: phoneIcon,
		label: __('Mobile preview', 'modula-best-grid-gallery'),
	},
]);

/**
 * @param {Object}                                          props
 * @param {'desktop'|'tablet'|'mobile'}                     props.previewViewport
 * @param {(viewport: 'desktop'|'tablet'|'mobile') => void} props.onPreviewViewportChange
 */
export default function CanvasDevicePill({
	previewViewport,
	onPreviewViewportChange,
}) {
	return (
		<div className="modula-takeover__canvas-device-pill">
			<div
				className="modula-takeover__canvas-device-pill-group"
				role="group"
				aria-label={__('Preview on', 'modula-best-grid-gallery')}
			>
				{VIEWPORTS.map((viewport) => {
					const isActive = previewViewport === viewport.id;
					return (
						<button
							key={viewport.id}
							type="button"
							className={`modula-takeover__canvas-device-pill-btn${
								isActive ? ' is-active' : ''
							}`}
							aria-label={viewport.label}
							title={viewport.label}
							aria-pressed={isActive}
							onClick={() => onPreviewViewportChange(viewport.id)}
						>
							<Icon icon={viewport.icon} size={16} />
						</button>
					);
				})}
			</div>
		</div>
	);
}
