/**
 * Visitor root stack classification: classic vs modern (Beta).
 *
 * Isolation hinge is the existing modern gallery root class on Beta markup
 * (`modula-gallery-modern`). Do not invent a parallel classic-only root class
 * or a second competing flag — classic and modern mounts both key off this.
 *
 * @package
 */

/** Class present on modern / Beta visitor gallery roots (PHP shortcode). */
export const MODERN_VISITOR_ROOT_CLASS = 'modula-gallery-modern';

/** Shared shell selector for classic and modern visitor gallery roots. */
export const VISITOR_GALLERY_ROOT_SELECTOR = '.modula.modula-gallery';

/** Modern / Beta roots only. */
export const MODERN_VISITOR_ROOT_SELECTOR = `${VISITOR_GALLERY_ROOT_SELECTOR}.${MODERN_VISITOR_ROOT_CLASS}`;

/** Classic roots only (excludes modern). */
export const CLASSIC_VISITOR_ROOT_SELECTOR = `${VISITOR_GALLERY_ROOT_SELECTOR}:not(.${MODERN_VISITOR_ROOT_CLASS})`;

/** Uninitialized modern / Beta roots — modern loader and bootstrap claim only these. */
export const MODERN_VISITOR_ROOT_PENDING_SELECTOR = `${MODERN_VISITOR_ROOT_SELECTOR}:not(.modula-gallery-initialized)`;

/**
 * @param {{ classList?: { contains?: (name: string) => boolean } }|null|undefined} root
 * @return {boolean}
 */
function hasVisitorGalleryShell(root) {
	if (!root?.classList || typeof root.classList.contains !== 'function') {
		return false;
	}
	return (
		root.classList.contains('modula') &&
		root.classList.contains('modula-gallery')
	);
}

/**
 * Modern / Beta visitor root: shared shell plus the modern gallery root class.
 *
 * @param {{ classList?: { contains?: (name: string) => boolean } }|null|undefined} root
 * @return {boolean}
 */
export function isModernVisitorRoot(root) {
	return (
		hasVisitorGalleryShell(root) &&
		root.classList.contains(MODERN_VISITOR_ROOT_CLASS)
	);
}

/**
 * Classic visitor root: shared shell classes without the modern class.
 *
 * @param {{ classList?: { contains?: (name: string) => boolean } }|null|undefined} root
 * @return {boolean}
 */
export function isClassicVisitorRoot(root) {
	return (
		hasVisitorGalleryShell(root) &&
		!root.classList.contains(MODERN_VISITOR_ROOT_CLASS)
	);
}
