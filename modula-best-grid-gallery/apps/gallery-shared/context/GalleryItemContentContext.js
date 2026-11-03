/**
 * A host's own content for image tiles whose text sits on the image, drawn
 * inside the gallery's tile (which keeps its layout, classes and the host's
 * chrome) in place of the gallery's link, media and overlay text. Pro's
 * Album visitor frontend draws an album's classic hover effect with it, in
 * the album template's markup that the effect's stylesheet animates. The
 * host gets the link the gallery would draw, to put where its markup needs
 * it. Default null: the gallery draws its own content.
 *
 * @package
 */

import { createContext } from '@wordpress/element';

/**
 * @callback GalleryItemContentRenderer
 * @param {Object}            item The tile's prepared item (`prepareItemData`).
 * @param {{ link: ?Object }} tile `link`: the props of the anchor the gallery would draw (`href`, classes, attributes, `aria-label`); null when the tile has no link.
 * @return {import('react').ReactNode} The tile's content; null for the gallery's own.
 */

/** @type {import('react').Context<GalleryItemContentRenderer|null>} */
export const GalleryItemContentContext = createContext(null);
