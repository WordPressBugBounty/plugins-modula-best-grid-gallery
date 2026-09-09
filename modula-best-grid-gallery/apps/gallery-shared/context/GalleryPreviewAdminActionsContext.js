/**
 * Settings-editor live preview: callbacks for per-item Edit / Replace / Delete on gallery tiles.
 * Provided by apps/gallery-editor; default null when absent (front / non-editor).
 *
 * @package
 */

import { createContext } from '@wordpress/element';

/**
 * @typedef {Object} GalleryPreviewAdminActionsValue
 * @property {(storeIndex: number) => void} openEditMetadata Open image edit sidebar (or metadata modal fallback).
 * @property {(storeIndex: number) => void} openFocusPoint Open focal-point (crop frame) modal.
 * @property {(storeIndex: number | number[]) => void | Promise<boolean>} openReplaceMedia Open media library replace flow (one or many slots). Resolves true when at least one slot was replaced.
 * @property {(storeIndex: number) => void} removeItem Remove item from gallery (preview + REST).
 * @property {(storeIndex: number) => void} [toggleGridItemLock] Toggle custom-grid RGL static lock (gridLocked).
 * @property {(storeIndex: number) => void} [openEditContentBlock] Edit v2 content block (settings-editor).
 * @property {(storeIndex: number) => void} [moveItemToPreviousPage] Move item to previous numbered preview page.
 * @property {(storeIndex: number) => void} [moveItemToNextPage] Move item to next numbered preview page.
 * @property {() => void} [schedulePersistPreviewItems] Debounced persist of preview item rows (e.g. custom grid drag/resize).
 * @property {boolean} [watermarkSelectionActive] When true, tiles can be toggled for watermark apply scope.
 * @property {(attachmentId: number) => boolean} [isWatermarkSelected]
 * @property {(attachmentId: number) => void} [toggleWatermarkSelection]
 * @property {boolean} [tileSelectionActive] When true, multi-select mode is on (tile click selects, not Image sidebar).
 * @property {(storeIndex: number) => boolean} [isTileSelected]
 * @property {(storeIndex: number, event?: { shiftKey?: boolean }) => void} [handleTileSelectionClick]
 * @property {number|null} [selectedEditStoreIndex] Currently open Image sidebar store index.
 * @property {(storeIndex: number) => boolean} [isItemEditSelected]
 */

/** @type {import('react').Context<GalleryPreviewAdminActionsValue|null>} */
export const GalleryPreviewAdminActionsContext = createContext(null);
