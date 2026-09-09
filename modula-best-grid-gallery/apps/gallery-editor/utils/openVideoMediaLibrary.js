/**
 * Pick a self-hosted video from wp.media (takeover Video modal).
 */
import { __ } from '@wordpress/i18n';

/**
 * @param {{
 *   onSelect: (payload: { attachmentId: number, url: string }) => void,
 *   onError?: (message: string) => void,
 *   onDismiss?: () => void,
 *   multiple?: boolean,
 * }} opts
 */
export function openVideoMediaLibrary({
	onSelect,
	onError,
	onDismiss,
	multiple = false,
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

	const frame = window.wp.media({
		title: __('Select a video', 'modula-best-grid-gallery'),
		button: {
			text: __('Use this video', 'modula-best-grid-gallery'),
		},
		multiple,
		library: { type: 'video' },
	});

	let didSelect = false;

	frame.on('select', () => {
		const attachment = frame.state().get('selection').first()?.toJSON();
		if (!attachment) {
			return;
		}
		const mime = typeof attachment.mime === 'string' ? attachment.mime : '';
		if (mime && !mime.startsWith('video/')) {
			onError?.(
				__(
					'Please select a video file from the Media Library.',
					'modula-best-grid-gallery'
				)
			);
			return;
		}
		const url =
			typeof attachment.url === 'string' ? attachment.url.trim() : '';
		const attachmentId = parseInt(attachment.id, 10);
		if (!url || !Number.isFinite(attachmentId) || attachmentId <= 0) {
			onError?.(
				__(
					'Could not read the selected video.',
					'modula-best-grid-gallery'
				)
			);
			return;
		}
		didSelect = true;
		onSelect({ attachmentId, url });
	});

	frame.on('close', () => {
		if (!didSelect) {
			onDismiss?.();
		}
	});

	frame.open();
}
