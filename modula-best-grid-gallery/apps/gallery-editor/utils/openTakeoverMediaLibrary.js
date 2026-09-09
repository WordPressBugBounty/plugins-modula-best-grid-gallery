/**
 * Open core `wp.media` modal, then persist attachments via REST so the v2 preview refreshes.
 * Pre-selects attachments already in the preview so they show as selected (legacy parity).
 */
import { __ } from '@wordpress/i18n';
import { galleryUploadPost } from '../api/galleryUploadApi';

/**
 * @param {{
 *   galleryId: number,
 *   uploadPosition: string,
 *   onSuccess?: () => void,
 *   onError?: (msg: string) => void,
 *   runPersistTask?: (fn: () => void | Promise<void>) => Promise<void>,
 *   existingAttachmentIds?: number[],
 * }} opts
 */
export function openTakeoverMediaLibrary({
	galleryId,
	uploadPosition,
	onSuccess,
	onError,
	runPersistTask,
	existingAttachmentIds = [],
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
	const pos = uploadPosition === 'start' ? 'start' : 'end';
	const persist =
		typeof runPersistTask === 'function'
			? runPersistTask
			: async (fn) => {
					await fn();
				};
	const frame = window.wp.media({
		title: __(
			'Add images from the Media Library',
			'modula-best-grid-gallery'
		),
		button: {
			text: __('Add to gallery', 'modula-best-grid-gallery'),
		},
		/* `'add'` = click toggles selection (legacy metabox). `true` replaces selection on each click. */
		multiple: 'add',
		library: { type: 'image' },
	});

	const idsToMarkSelected = Array.isArray(existingAttachmentIds)
		? [
				...new Set(
					existingAttachmentIds
						.map((id) => Number(id))
						.filter((n) => n > 0)
				),
			]
		: [];

	frame.on('open', () => {
		const selection = frame.state().get('selection');
		selection.reset();
		const { media } = window.wp;
		if (!media?.attachment) {
			return;
		}
		for (const id of idsToMarkSelected) {
			const attachment = media.attachment(id);
			selection.add(attachment ? [attachment] : []);
		}
		if (selection.length) {
			selection.single(selection.last());
		}
	});

	frame.on('select', () => {
		const selection = frame.state().get('selection');
		const ids = [];
		selection.each((attachment) => {
			const id = attachment.get('id');
			if (id) {
				ids.push(id);
			}
		});
		if (!ids.length) {
			return;
		}
		void persist(async () => {
			return galleryUploadPost(galleryId, 'add-images', {
				ids,
				upload_position: pos,
			});
		})
			.then(() => {
				onSuccess?.();
			})
			.catch((err) => {
				const msg = err?.message || err?.data?.message || String(err);
				onError?.(msg);
			});
	});
	frame.open();
}
