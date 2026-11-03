/**
 * Settings-editor canvas: the static filter bar the gallery draws where the
 * visitor's bar goes, around every tile (Lite ticket 96). Only the visitor
 * filters, so the canvas never mounts the visitor's `FilterBar`.
 * Provided by the editor that wants the bar (the gallery editor gives
 * `CanvasFiltersPreviewBar`); default null, when the canvas draws no bar.
 *
 * @package
 */

import { createContext } from '@wordpress/element';

/** @type {import('react').Context<import('react').ComponentType|null>} */
export const GalleryPreviewFilterBarContext = createContext(null);
