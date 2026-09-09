/**
 * Notifies LazyPictureGate when the full-resolution tile image has loaded.
 *
 * @package
 */

import { createContext } from '@wordpress/element';

/** @type {import('react').Context<(() => void)|null>} */
export const PictureStackRevealContext = createContext(null);
