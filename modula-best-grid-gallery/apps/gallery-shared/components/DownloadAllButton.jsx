/**
 * The “Download all” button (Pro download extension parity), drawn from the
 * grouped `download.*` settings. The gallery feeds it from its store
 * (`GalleryDownloadAllButton`); the Pro albums editor feeds it from the album
 * form, whose `download.*` keys are the same.
 *
 * @package
 */
import { __ } from '@wordpress/i18n';
import {
	buildDownloadAllUrl,
	resolveDownloadAllButtonLook,
	shouldRenderDownloadAllAtPlacement,
} from '../utils/downloadAllButton';

/**
 * Renders nothing when “Where it sits” leaves out this placement. Callers
 * decide whether the button is on at all (`shouldShowDownloadAllButton`).
 *
 * @param {{
 *   download: Object,
 *   placement: 'above'|'below',
 *   galleryId?: number|string,
 *   editorPreview?: boolean,
 * }} props
 * @return {import('react').JSX.Element|null} The button, or null at a placement it skips.
 */
export default function DownloadAllButton({
	download,
	placement,
	galleryId,
	editorPreview = false,
}) {
	if (
		!shouldRenderDownloadAllAtPlacement(
			download.downloadAllPosition,
			placement
		)
	) {
		return null;
	}

	const look = resolveDownloadAllButtonLook(download);
	const href = buildDownloadAllUrl(galleryId, editorPreview);
	const label =
		look.label || __('Download All Images', 'modula-best-grid-gallery');

	const wrapperStyle = {
		textAlign: look.hposition,
	};
	const linkStyle = {};
	if (look.textColor) {
		linkStyle.color = look.textColor;
	}
	if (look.backgroundColor) {
		linkStyle.backgroundColor = look.backgroundColor;
	}

	const anchorId =
		galleryId !== null && galleryId !== undefined && galleryId !== ''
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
				{look.showIcon ? (
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						width="24"
						height="24"
						aria-hidden="true"
						style={
							look.iconColor
								? { fill: look.iconColor }
								: undefined
						}
					>
						<path d="M18.62 17.09V19H5.38v-1.91zm-2.97-6.96L17 11.45l-5 4.87-5-4.87 1.36-1.32 2.68 2.64V5h1.92v7.77z" />
					</svg>
				) : null}
				{label}
			</a>
		</div>
	);
}
