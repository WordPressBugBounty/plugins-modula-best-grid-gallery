/**
 * A host's own chrome on each image tile, drawn above the image (outside the
 * media shell, so "Zoom on hover" does not scale it), and on a slider slide's
 * image. Pro's Album visitor frontend draws a member's image count and
 * download button with it. Default null: the gallery draws none.
 *
 * @package
 */

import { createContext } from '@wordpress/element';

/**
 * @callback GalleryItemChromeRenderer
 * @param {Object} itemData The tile's item, as the store holds it.
 * @return {import('react').ReactNode} The tile's chrome; null for none.
 */

/** @type {import('react').Context<GalleryItemChromeRenderer|null>} */
export const GalleryItemChromeContext = createContext(null);
