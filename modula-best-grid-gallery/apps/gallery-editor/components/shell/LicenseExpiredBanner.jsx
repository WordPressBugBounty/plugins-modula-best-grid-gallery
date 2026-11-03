/**
 * Canvas banner while this site's Modula PRO license has expired: in
 * renewal grace (its features still work) and after it. The state is the
 * license card's (`licenseState`, from Compatible Pro's licensing); admin-ui
 * draws the banner and its wording.
 */
import { LicenseExpiredBanner as AdminLicenseExpiredBanner } from 'admin-ui';
import { useModulaSettingsEditorConfig } from '../../hooks/useModulaSettingsEditorConfig';
import { licenseRenewHref } from 'gallery-shared/preview';

export default function LicenseExpiredBanner() {
	const editor = useModulaSettingsEditorConfig();

	return (
		<AdminLicenseExpiredBanner
			licenseState={editor.licenseState}
			renewHref={licenseRenewHref(editor.upgradeUrl)}
			className="modula-takeover__license-expired"
		/>
	);
}
