import { __ } from '@wordpress/i18n';
import { Icon, desktop } from '@wordpress/icons';
import { Button } from 'shared-ui';
import { useModulaSettingsEditorConfig } from '../../hooks/useModulaSettingsEditorConfig';
import { getGalleryListUrl } from '../../utils/galleryAdminUrls';

/**
 * Full-screen gate shown when the takeover editor is opened on a phone or tablet.
 */
export default function DesktopOnlyNotice() {
	const config = useModulaSettingsEditorConfig();
	const backUrl = getGalleryListUrl(config);

	return (
		<div
			className="modula-gallery-takeover__desktop-only modula-gallery-takeover__desktop-only--mounted"
			role="region"
			aria-labelledby="modula-desktop-only-title"
		>
			<div className="modula-gallery-takeover__desktop-only-inner">
				<span
					className="modula-gallery-takeover__desktop-only-icon"
					aria-hidden="true"
				>
					<Icon icon={desktop} size={48} />
				</span>
				<h1
					id="modula-desktop-only-title"
					className="modula-gallery-takeover__desktop-only-title"
				>
					{__('Desktop only', 'modula-best-grid-gallery')}
				</h1>
				<p className="modula-gallery-takeover__desktop-only-body">
					{__(
						'The gallery editor is a desktop experience. Open this page on a computer to continue.',
						'modula-best-grid-gallery'
					)}
				</p>
				<Button variant="primary" href={backUrl}>
					{__('Back', 'modula-best-grid-gallery')}
				</Button>
			</div>
		</div>
	);
}
