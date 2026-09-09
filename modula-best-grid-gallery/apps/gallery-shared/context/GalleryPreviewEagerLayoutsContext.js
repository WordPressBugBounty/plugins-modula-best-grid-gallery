/**
 * Optional map of layout type → component for synchronous editor preview rendering.
 *
 * @package
 */

import { createContext } from '@wordpress/element';

/** @type {import('react').Context<Record<string, import('react').ComponentType>|null>} */
export const GalleryPreviewEagerLayoutsContext = createContext(null);
