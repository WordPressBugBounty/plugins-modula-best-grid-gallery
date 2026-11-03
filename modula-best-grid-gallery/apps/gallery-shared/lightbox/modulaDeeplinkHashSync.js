/**
 * Keep the address bar on full-gallery deeplink numbers while a Modula lightbox is open.
 *
 * Fancybox's Hash plugin numbers slides by their place in the opened set, which is
 * the filtered view when a gallery filter is active. The plugin still owns history
 * (push on open, back or restore on close); these handlers only rewrite the URL of
 * the current entry after it, and drop this gallery's deeplink once the lightbox is gone.
 *
 * @package
 */
import { parseModulaDeeplinkHash } from './modulaDeeplinkFromHash';

/**
 * @param {Object} fancybox
 * @return {string} The gallery's Hash slug (`{prefix}-{galleryId}`), or '' when URL sync is off.
 */
function resolveHashSlug(fancybox) {
	const hashOpts = fancybox?.getOptions?.()?.Hash;
	return typeof hashOpts?.slug === 'string' ? hashOpts.slug : '';
}

/**
 * @param {string} hash Hash including '#', or '' to remove it.
 */
function replaceUrlHash(hash) {
	const { pathname, search } = window.location;
	window.history.replaceState(
		window.history.state,
		document.title,
		`${pathname}${search}${hash}`
	);
}

/**
 * Write the current slide's full-gallery hash (see `withDeeplinkHashes`).
 *
 * @param {Object} fancybox
 */
export function syncDeeplinkHashToSlide(fancybox) {
	if (!resolveHashSlug(fancybox)) {
		return;
	}
	// Runs after the Hash plugin's handler for the same event, which writes its own index.
	queueMicrotask(() => {
		const pageIndex = fancybox.getCarousel?.()?.getPageIndex?.() ?? 0;
		const hash =
			fancybox.modulaSlideSources?.[pageIndex]?.modulaDeeplinkHash;
		if (typeof hash === 'string' && hash !== window.location.hash) {
			replaceUrlHash(hash);
		}
	});
}

/**
 * Remove this gallery's deeplink once its lightbox is destroyed, so the same link
 * can open it again and later gallery updates do not reopen it.
 *
 * @param {Object} fancybox
 */
export function clearDeeplinkHashAfterClose(fancybox) {
	const slug = resolveHashSlug(fancybox);
	const parsed = parseModulaDeeplinkHash(window.location.hash);
	if (!slug || !parsed) {
		return;
	}
	if (`${parsed.prefix}-${parsed.galleryId}` === slug) {
		replaceUrlHash('');
	}
}
