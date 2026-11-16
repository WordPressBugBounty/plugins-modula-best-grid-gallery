/**
 * Pick one or more videos from wp.media and add them to the gallery (takeover).
 * Pro video extension registers the implementation via window.modula.video.
 */
import { __ } from '@wordpress/i18n';
import { getVideoEditorRegistration } from '../platform/videoRegistry';

/**
 * @param {{
 *   galleryId: number,
 *   uploadPosition: string,
 *   onSuccess?: () => void,
 *   onError?: (msg: string) => void,
 *   addItems?: import('../hooks/useGalleryEditorChanges').GalleryEditorChanges['addItems'],
 *   multiple?: boolean | 'add',
 * }} opts `addItems` (Lite 3.0.21) adds the built video rows as unsaved changes.
 */
export function openTakeoverVideoMediaLibrary(opts) {
	const open = getVideoEditorRegistration()?.openMediaLibrary;
	if (typeof open === 'function') {
		open(opts);
		return;
	}
	opts?.onError?.(
		__(
			'Video extension is not available on this screen.',
			'modula-best-grid-gallery'
		)
	);
}
