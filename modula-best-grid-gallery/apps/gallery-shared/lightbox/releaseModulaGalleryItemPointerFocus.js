/**
 * Drop pointer focus on gallery tiles so :focus-within hover styles reset after lightbox.
 *
 * @package
 */

/**
 * @param {HTMLElement|null|undefined} link `.modula-item-link` that opened the lightbox.
 */
export function releaseModulaGalleryItemPointerFocus(link) {
	if (!(link instanceof HTMLElement)) {
		return;
	}
	if (document.activeElement === link) {
		link.blur();
	}
}

/**
 * @param {HTMLElement|null|undefined} host Gallery React root (often `display: contents`).
 * @returns {HTMLElement|null}
 */
function resolveModulaGalleryHoverResetRoot(host) {
	if (!(host instanceof HTMLElement)) {
		return null;
	}
	const modulaRoot = host.closest('.modula[id^="modula-"]');
	if (modulaRoot instanceof HTMLElement) {
		return modulaRoot;
	}
	const items = host.querySelector('.modula-items');
	if (items instanceof HTMLElement) {
		return items;
	}
	const siblingItems = host.parentElement?.querySelector?.('.modula-items');
	return siblingItems instanceof HTMLElement ? siblingItems : host;
}

/**
 * @param {HTMLElement|null|undefined} host Gallery React root.
 */
export function refreshModulaGalleryTileHoverState(host) {
	const resetRoot = resolveModulaGalleryHoverResetRoot(host);
	if (!(resetRoot instanceof HTMLElement)) {
		return;
	}
	resetRoot.classList.add('modula-lightbox-hover-reset');
	resetRoot.style.pointerEvents = 'none';
	requestAnimationFrame(() => {
		resetRoot.style.pointerEvents = '';
		resetRoot.classList.remove('modula-lightbox-hover-reset');
	});
}

/**
 * @param {object} [context]
 * @param {boolean} [context.editorPreview]
 * @param {boolean} [context.openedViaKeyboard]
 * @param {HTMLElement} [context.galleryHostEl] Gallery host for hover-state refresh on close.
 * @param {HTMLElement} [context.clickedTileEl] Tile that opened the lightbox.
 */
export function releaseModulaGalleryItemPointerFocusFromContext(context = {}) {
	if (!context.openedViaKeyboard && !context.editorPreview) {
		requestAnimationFrame(() => {
			const active = document.activeElement;
			if (
				active instanceof HTMLElement &&
				active.closest(
					'.modula-item .modula-item-link, .modula-item-link.tile-inner'
				)
			) {
				active.blur();
			}
		});
	}
	if (context.clickedTileEl instanceof HTMLElement) {
		context.clickedTileEl.dispatchEvent(
			new MouseEvent('mouseout', { bubbles: true })
		);
		context.clickedTileEl.dispatchEvent(
			new MouseEvent('mouseleave', { bubbles: true })
		);
	}
	refreshModulaGalleryTileHoverState(context.galleryHostEl);
}
