/**
 * Creative Commons / custom license attribution under the gallery (v2 React).
 *
 * @package
 */
import { __ } from '@wordpress/i18n';
import { useSelector } from 'react-redux';
import {
	getGalleryLicenseKey,
	getLicenseEntry,
	shouldShowLicenseBox,
} from '../utils/licensing';

export default function GalleryLicensingBox() {
	const settings = useSelector((state) => state.gallery.settings || {});
	const metadata = useSelector((state) => state.gallery.metadata || {});

	if (!shouldShowLicenseBox(settings, metadata)) {
		return null;
	}

	const licenseKey = getGalleryLicenseKey(settings);
	const entry = getLicenseEntry(metadata.licenseCatalog, licenseKey);
	if (!entry) {
		return null;
	}

	const name = typeof entry.name === 'string' ? entry.name : '';
	const licenseUrl =
		typeof entry.license === 'string' ? entry.license.trim() : '';
	const imageUrl = typeof entry.image === 'string' ? entry.image.trim() : '';

	if (!licenseUrl && !name) {
		return null;
	}

	return (
		<div className="modula-creative-commons-wrap">
			{imageUrl ? (
				<a rel="license" href={licenseUrl} target="_blank">
					<img
						alt={name || __('Creative Commons License', 'modula-best-grid-gallery')}
						style={{ borderWidth: 0 }}
						src={imageUrl}
					/>
				</a>
			) : null}
			<span>
				{__('This work is licensed under a', 'modula-best-grid-gallery')}{' '}
				<a rel="license" href={licenseUrl} target="_blank">
					{name}
				</a>
			</span>
		</div>
	);
}
