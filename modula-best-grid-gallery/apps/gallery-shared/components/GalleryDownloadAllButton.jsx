/**
 * Gallery-level “Download all” control (Pro download extension parity for React mounts).
 *
 * @package
 */
import { __ } from '@wordpress/i18n';
import { useSelector } from 'react-redux';
import { isSettingsEditorPreview } from '../utils/displayContext';
import {
	buildDownloadAllUrl,
	isDownloadToggleOn,
	resolveDownloadAllHposition,
	shouldRenderDownloadAllAtPlacement,
	shouldShowDownloadAllGalleryButton,
} from '../utils/downloadAllButton';

/**
 * @param {{ placement: 'above'|'below' }} props
 * @return {import('react').JSX.Element|null}
 */
export default function GalleryDownloadAllButton({ placement }) {
	const settings = useSelector((state) => state.gallery.settings || {});
	const metadata = useSelector((state) => state.gallery.metadata || {});
	const galleryId = useSelector(
		(state) => state.gallery.galleryId || state.gallery.config?.galleryId
	);

	if (!shouldShowDownloadAllGalleryButton(settings)) {
		return null;
	}

	const download = settings.download || {};
	if (
		!shouldRenderDownloadAllAtPlacement(
			download.downloadAllPosition,
			placement
		)
	) {
		return null;
	}

	const editorPreview = isSettingsEditorPreview(metadata);
	const href = buildDownloadAllUrl(galleryId, editorPreview);
	const label =
		typeof download.downloadAllLabel === 'string' &&
		download.downloadAllLabel.trim() !== ''
			? download.downloadAllLabel.trim()
			: __('Download All Images', 'modula-best-grid-gallery');
	const showIcon = isDownloadToggleOn(download.downloadAllGalleryButtonIcon);
	const hposition = resolveDownloadAllHposition(
		download.downloadAllHposition
	);
	const textColor =
		typeof download.downloadAllColor === 'string'
			? download.downloadAllColor.trim()
			: '';
	const backgroundColor =
		typeof download.downloadAllBackgroundColor === 'string'
			? download.downloadAllBackgroundColor.trim()
			: '';
	const iconColor =
		typeof download.downloadAllGalleryIconColor === 'string'
			? download.downloadAllGalleryIconColor.trim()
			: '';

	const wrapperStyle = {
		textAlign: hposition,
	};
	const linkStyle = {};
	if (textColor) {
		linkStyle.color = textColor;
	}
	if (backgroundColor) {
		linkStyle.backgroundColor = backgroundColor;
	}

	const anchorId =
		galleryId != null && galleryId !== ''
			? `modula-${galleryId}-download`
			: undefined;

	return (
		<div
			className="modula-download-all-button wp-block-button"
			style={wrapperStyle}
		>
			<a
				href={href}
				className="modula-download-all wp-block-button__link wp-element-button"
				id={anchorId}
				target="_self"
				style={linkStyle}
				onClick={
					editorPreview
						? (event) => event.preventDefault()
						: undefined
				}
			>
				{showIcon ? (
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						width="24"
						height="24"
						aria-hidden="true"
						style={iconColor ? { fill: iconColor } : undefined}
					>
						<path d="M18.62 17.09V19H5.38v-1.91zm-2.97-6.96L17 11.45l-5 4.87-5-4.87 1.36-1.32 2.68 2.64V5h1.92v7.77z" />
					</svg>
				) : null}
				{label}
			</a>
		</div>
	);
}
