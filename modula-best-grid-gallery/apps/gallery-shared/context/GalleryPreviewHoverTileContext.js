/**
 * Settings-editor live preview: the hover classes and tile vars a visitor tile
 * gets for the current (unsaved) settings. The preview tiles use them in place
 * of the saved ones from the bootstrap rows.
 * Provided by apps/gallery-editor; default null when absent (front / non-editor),
 * and null when the gallery has no hover effect.
 *
 * @package
 */

import { createContext } from '@wordpress/element';

/**
 * @typedef {Object} GalleryPreviewHoverTile
 * @property {string}                 className Space-separated `modula-hover-*` tile classes.
 * @property {Record<string, string>} style     `--modula-hover-*` tile custom properties.
 */

/** @type {import('react').Context<GalleryPreviewHoverTile|null>} */
export const GalleryPreviewHoverTileContext = createContext(null);
