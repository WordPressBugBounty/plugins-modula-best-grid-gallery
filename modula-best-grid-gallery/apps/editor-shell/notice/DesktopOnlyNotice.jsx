import { __ } from '@wordpress/i18n';
import { Icon, desktop } from '@wordpress/icons';
import { Button } from 'shared-ui';

/**
 * Full-screen gate shown when the takeover editor is opened on a phone or tablet.
 *
 * @param {Object} props
 * @param {string} props.backUrl Listing the Back button returns to.
 * @param {string} props.message Why the editor needs a desktop (names the editor).
 */
export default function DesktopOnlyNotice({ backUrl, message }) {
	return (
		<div
			className="modula-takeover__desktop-only modula-takeover__desktop-only--mounted"
			role="region"
			aria-labelledby="modula-desktop-only-title"
		>
			<div className="modula-takeover__desktop-only-inner">
				<span
					className="modula-takeover__desktop-only-icon"
					aria-hidden="true"
				>
					<Icon icon={desktop} size={48} />
				</span>
				<h1
					id="modula-desktop-only-title"
					className="modula-takeover__desktop-only-title"
				>
					{__('Desktop only', 'modula-best-grid-gallery')}
				</h1>
				<p className="modula-takeover__desktop-only-body">{message}</p>
				<Button variant="primary" href={backUrl}>
					{__('Back', 'modula-best-grid-gallery')}
				</Button>
			</div>
		</div>
	);
}
