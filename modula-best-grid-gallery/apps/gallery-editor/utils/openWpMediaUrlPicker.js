/**
 * Pick a media file from wp.media and return its public URL (no attachment ID stored).
 */
import { __ } from '@wordpress/i18n';
import { bindWpMediaFrameStacking } from './wpMediaFrameStacking';

/**
 * @param {{
 *   libraryType?: 'image' | 'video' | '',
 *   title?: string,
 *   buttonText?: string,
 *   onSelect: (url: string) => void,
 *   onError?: (message: string) => void,
 * }} opts
 */
export function openWpMediaUrlPicker({
	libraryType = '',
	title,
	buttonText,
	onSelect,
	onError,
}) {
	if (typeof window === 'undefined' || !window.wp?.media) {
		onError?.(
			__(
				'WordPress media library is not available.',
				'modula-best-grid-gallery'
			)
		);
		return;
	}

	const library =
		libraryType === 'video' || libraryType === 'image'
			? { type: libraryType }
			: {};

	const frame = window.wp.media({
		title: title || __('Choose media', 'modula-best-grid-gallery'),
		button: {
			text: buttonText || __('Use this file', 'modula-best-grid-gallery'),
		},
		multiple: false,
		library,
	});

	bindWpMediaFrameStacking(frame);

	frame.on('select', () => {
		const attachment = frame.state().get('selection').first()?.toJSON();
		if (!attachment) {
			return;
		}
		const mime = typeof attachment.mime === 'string' ? attachment.mime : '';
		if (libraryType === 'video' && mime && !mime.startsWith('video/')) {
			onError?.(
				__(
					'Please select a video file from the Media Library.',
					'modula-best-grid-gallery'
				)
			);
			return;
		}
		if (libraryType === 'image' && mime && !mime.startsWith('image/')) {
			onError?.(
				__(
					'Please select an image file from the Media Library.',
					'modula-best-grid-gallery'
				)
			);
			return;
		}
		const url =
			typeof attachment.url === 'string' ? attachment.url.trim() : '';
		if (!url) {
			onError?.(
				__(
					'Could not read the selected file URL.',
					'modula-best-grid-gallery'
				)
			);
			return;
		}
		onSelect(url);
	});

	frame.open();
}
