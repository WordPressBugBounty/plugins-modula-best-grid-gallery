/**
 * BnB layout: “Show all photos” control on the last featured thumbnail.
 *
 * @package
 */

import { useCallback } from '@wordpress/element';
import { __, _n, sprintf } from '@wordpress/i18n';
import { useSelector } from 'react-redux';
import { openModulaGalleryLightboxAtRoot } from '../lightbox/lightboxOpenFacade';

function BnbGridIcon() {
	return (
		<svg
			className="modula-bnb-show-all-photos__icon"
			width="16"
			height="16"
			viewBox="0 0 16 16"
			aria-hidden="true"
			focusable="false"
		>
			<rect
				x="1"
				y="1"
				width="4"
				height="4"
				rx="0.5"
				fill="currentColor"
			/>
			<rect
				x="6"
				y="1"
				width="4"
				height="4"
				rx="0.5"
				fill="currentColor"
			/>
			<rect
				x="11"
				y="1"
				width="4"
				height="4"
				rx="0.5"
				fill="currentColor"
			/>
			<rect
				x="1"
				y="6"
				width="4"
				height="4"
				rx="0.5"
				fill="currentColor"
			/>
			<rect
				x="6"
				y="6"
				width="4"
				height="4"
				rx="0.5"
				fill="currentColor"
			/>
			<rect
				x="11"
				y="6"
				width="4"
				height="4"
				rx="0.5"
				fill="currentColor"
			/>
			<rect
				x="1"
				y="11"
				width="4"
				height="4"
				rx="0.5"
				fill="currentColor"
			/>
			<rect
				x="6"
				y="11"
				width="4"
				height="4"
				rx="0.5"
				fill="currentColor"
			/>
			<rect
				x="11"
				y="11"
				width="4"
				height="4"
				rx="0.5"
				fill="currentColor"
			/>
		</svg>
	);
}

/**
 * @param {object} props
 * @param {number} props.moreCount Hidden image count (beyond the five featured tiles).
 * @param {object} props.config Gallery config from the store.
 */
export default function BnbShowAllPhotosButton({ moreCount, config }) {
	const items = useSelector(
		(state) => state.items.filteredItems ?? state.items.items
	);
	const settings = useSelector((state) => state.gallery.settings || {});

	const onOpenLightbox = useCallback(
		(event) => {
			event.preventDefault();
			event.stopPropagation();
			const host = event.currentTarget.closest(
				'.modula-gallery-react-host'
			);
			if (!host) {
				return;
			}
			// BnB hides all but the featured tiles, so the "Show all photos"
			// action is the only way to view the rest — always open the
			// lightbox, even when the gallery link mode is "no-link".
			const lightboxConfig =
				config?.lightbox === 'fancybox'
					? config
					: { ...config, lightbox: 'fancybox' };
			openModulaGalleryLightboxAtRoot(host, lightboxConfig, 0, {
				items,
				settings,
				openedViaKeyboard: false,
				galleryHostEl: host,
			});
		},
		[config, items, settings]
	);

	if (moreCount < 1) {
		return null;
	}

	const countLabel = sprintf(
		/* translators: %d: number of additional gallery images not shown in the BnB grid. */
		_n(
			'(%d more image)',
			'(%d more images)',
			moreCount,
			'modula-best-grid-gallery'
		),
		moreCount
	);

	return (
		<button
			type="button"
			className="modula-bnb-show-all-photos"
			onClick={onOpenLightbox}
			aria-label={sprintf(
				/* translators: %s: count of additional images, e.g. "(16 more images)". */
				__('Show all photos %s', 'modula-best-grid-gallery'),
				countLabel
			)}
		>
			<BnbGridIcon />
			<span className="modula-bnb-show-all-photos__label">
				{__('Show all photos', 'modula-best-grid-gallery')}
			</span>
			<span className="modula-bnb-show-all-photos__count">
				{countLabel}
			</span>
		</button>
	);
}
