/**
 * PHP prints opacity/visibility inline for anti-FOUC; clear when the shell becomes interactive.
 *
 * @package
 */

const GALLERY_STYLE_PATTERN =
	/modula-gallery(?:-bootstrap)?(?:\.modula-gallery)?\.css/;

/**
 * @param {HTMLElement|null|undefined} element
 */
export function clearGalleryShellInlineHide(element) {
	if (!(element instanceof HTMLElement)) {
		return;
	}
	element.style.removeProperty('opacity');
	element.style.removeProperty('visibility');
}

/**
 * Wait until filter/pagination chrome CSS is available (external file or inline).
 *
 * @returns {Promise<void>}
 */
export function waitForGalleryChromeStyles() {
	if (typeof document === 'undefined') {
		return Promise.resolve();
	}

	const links = Array.from(
		document.querySelectorAll('link[rel="stylesheet"]')
	).filter((link) => GALLERY_STYLE_PATTERN.test(link.href));

	if (links.length === 0) {
		return Promise.resolve();
	}

	const ready = links.some((link) => {
		try {
			return Boolean(link.sheet && link.sheet.cssRules);
		} catch {
			return false;
		}
	});
	if (ready) {
		return Promise.resolve();
	}

	return new Promise((resolve) => {
		let pending = links.length;
		const done = () => {
			pending -= 1;
			if (pending <= 0) {
				resolve();
			}
		};
		links.forEach((link) => {
			link.addEventListener('load', done, { once: true });
			link.addEventListener('error', done, { once: true });
		});
		window.setTimeout(resolve, 4000);
	});
}

/**
 * @param {HTMLElement} element
 */
export function revealGalleryChrome(element) {
	element.classList.add('modula-gallery-chrome-ready');
}
