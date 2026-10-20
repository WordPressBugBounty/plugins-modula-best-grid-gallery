/**
 * The Modula item of the wp-admin menu. Turning an extension on or off adds
 * or removes its entries (Albums, Presets, Image Licenses, …), and the page
 * does not reload, so the item is refreshed after each change.
 */

// The item WordPress renders for the gallery post type's top-level menu.
const MENU_ITEM_ID = 'menu-posts-modula-gallery';

/**
 * Puts the Modula item of a freshly rendered admin page in place of the live
 * one. The fresh item carries WordPress's own titles (translated), every
 * submenu entry any code registered, and the current-page state, which a
 * server-side copy of the menu could not keep in step with.
 *
 * The live `<li>` element stays and takes the fresh item's class and
 * content: the item is replaced, not nested in itself, and wp-admin's
 * handlers bound to the element at load (the folded menu's flyout) keep
 * working.
 *
 * @param {Document} live Document showing the menu.
 * @param {string}   html An admin page as WordPress rendered it.
 * @return {boolean} Whether the item was replaced; false leaves the menu as it was.
 */
export function swapAdminMenuItem(live, html) {
	const current = live.getElementById(MENU_ITEM_ID);
	const fresh = new window.DOMParser()
		.parseFromString(html, 'text/html')
		.getElementById(MENU_ITEM_ID);

	if (!current || !fresh) {
		return false;
	}

	current.className = fresh.className;
	current.replaceChildren(
		...[...fresh.childNodes].map((node) => live.importNode(node, true))
	);

	return true;
}

/**
 * Reloads this admin page in the background and takes its Modula item. A
 * failed request leaves the menu as it was: it is only stale until the next
 * page load, while the change itself is already saved and announced.
 *
 * The page is rendered in full on the server (about a page load), after
 * the change is announced, so the admin does not wait for it.
 *
 * @return {Promise<void>} Settles when the menu is refreshed or left as it was.
 */
export async function refreshAdminMenu() {
	try {
		const response = await window.fetch(window.location.href, {
			credentials: 'same-origin',
		});

		if (response.ok) {
			swapAdminMenuItem(document, await response.text());
		}
	} catch {
		// Network failure: the menu stays as it was (see above).
	}
}
