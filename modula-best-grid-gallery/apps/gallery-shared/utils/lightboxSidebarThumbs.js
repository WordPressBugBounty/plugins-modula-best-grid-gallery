/**
 * Sidebar thumbnail strip helpers (left/right, non-bottom).
 *
 * @package
 */

/**
 * @param {object} opts Modula lightbox options.
 * @returns {boolean}
 */
export function isModulaLightboxSidebarThumbsPosition(opts) {
	return Boolean(opts?.Thumbs?.position && opts.Thumbs.position !== 'bottom');
}
