/**
 * Sidebar thumbnail strip helpers (left/right, non-bottom).
 *
 * @package
 */

/**
 * @param {Object} opts Modula lightbox options.
 * @return {boolean}
 */
export function isModulaLightboxSidebarThumbsPosition(opts) {
	return Boolean(opts?.Thumbs?.position && opts.Thumbs.position !== 'bottom');
}
