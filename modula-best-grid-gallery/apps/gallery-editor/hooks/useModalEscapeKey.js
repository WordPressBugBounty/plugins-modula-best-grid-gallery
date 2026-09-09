import { useEffect, useRef } from '@wordpress/element';
import { WP_MEDIA_FRAME_BODY_CLASS } from '../utils/wpMediaFrameStacking';

/**
 * Close a custom overlay/dialog on Escape (capture phase).
 * Matches SettingsCommandPalette / bulk-edit modal patterns; use `stopImmediate` when
 * WP admin global shortcuts must lose to the modal (e.g. metadata + TinyMCE focus fights).
 *
 * @param {boolean} enabled
 * @param {() => void} onClose
 * @param {{
 *   listenTarget?: 'window' | 'document',
 *   stopImmediate?: boolean,
 * }} [options]
 */
export function useModalEscapeKey(enabled, onClose, options = {}) {
	const { listenTarget = 'document', stopImmediate = false } = options;
	const onCloseRef = useRef(onClose);
	onCloseRef.current = onClose;

	useEffect(() => {
		if (!enabled) {
			return undefined;
		}

		const target = listenTarget === 'window' ? window : document;

		const onKeyDown = (event) => {
			if (event.key !== 'Escape') {
				return;
			}
			/* Let core wp.media own Escape while its frame is open above our shell. */
			if (
				typeof document !== 'undefined' &&
				document.body?.classList?.contains(WP_MEDIA_FRAME_BODY_CLASS)
			) {
				return;
			}
			event.preventDefault();
			if (stopImmediate) {
				event.stopImmediatePropagation();
			} else {
				event.stopPropagation();
			}
			onCloseRef.current();
		};

		target.addEventListener('keydown', onKeyDown, true);
		return () => {
			target.removeEventListener('keydown', onKeyDown, true);
		};
	}, [enabled, listenTarget, stopImmediate]);
}
