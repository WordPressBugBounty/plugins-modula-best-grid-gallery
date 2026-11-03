/**
 * Settings-editor live preview: callbacks for per-item Edit / Replace / Delete on gallery tiles.
 * Provided by apps/gallery-editor; default null when absent (front / non-editor).
 *
 * @package
 */

import { createContext } from '@wordpress/element';

/**
 * @typedef {Object} GalleryPreviewAdminActionsValue
 * @property {'desktop'|'tablet'|'mobile'}                                  [previewViewport]                    Active authoring preview viewport.
 * @property {(storeIndex: number) => void}                                 openEditMetadata                     Open image edit sidebar (or metadata modal fallback).
 * @property {(storeIndex: number) => void}                                 openFocusPoint                       Open focal-point (crop frame) modal.
 * @property {(storeIndex: number | number[]) => void | Promise<boolean>}   openReplaceMedia                     Open media library replace flow (one or many slots). Resolves true when at least one slot was replaced.
 * @property {(storeIndex: number) => void}                                 removeItem                           Remove item from gallery (preview + REST); the editor records it in history and offers Undo.
 * @property {(storeIndex: number) => void}                                 [toggleGridItemLock]                 Toggle custom-grid RGL static lock (gridLocked).
 * @property {(storeIndex: number) => void}                                 [openEditContentBlock]               Edit v2 content block (settings-editor).
 * @property {(storeIndex: number) => void}                                 [moveItemToPreviousPage]             Move item to previous numbered preview page.
 * @property {(storeIndex: number) => void}                                 [moveItemToNextPage]                 Move item to next numbered preview page.
 * @property {() => void}                                                   [schedulePersistPreviewItems]        Debounced persist of preview item rows (e.g. custom grid drag/resize).
 * @property {(args: { kind: 'drag'|'resize' }) => void}                    [onCustomGridLayoutInteractionStart] Gallery editor: seed layout history baseline before drag/resize.
 * @property {(args: { kind: 'drag'|'resize' }) => void}                    [onCustomGridLayoutCommit]           Gallery editor: record one layout history step after drag/resize stop.
 * @property {() => void}                                                   [onCustomGridLayoutInteractionEnd]   Gallery editor: drag/resize released, cancelled or unmounted; held item saves resume.
 * @property {boolean}                                                      [watermarkSelectionActive]           When true, tiles can be toggled for watermark apply scope.
 * @property {(attachmentId: number) => boolean}                            [isWatermarkSelected]
 * @property {(attachmentId: number) => void}                               [toggleWatermarkSelection]
 * @property {(storeIndex: number, click: { shiftKey: boolean }) => void}  [selectItem]                         Select a tile (outline + toolbar); the toolbar opens its panel. `click.shiftKey`: Shift was held.
 * @property {(storeIndex: number) => void}                                 [openItem]                           Double-click on a tile: open its panel, as its toolbar's Edit does. Hosts without it ignore double-clicks.
 * @property {(storeIndex: number) => boolean}                              [isItemSelected]
 * @property {import('react').ComponentType<{storeIndex: number, itemData: Object}>} [SelectedTileToolbar] Host toolbar drawn inside the selected tile.
 * @property {import('react').ComponentType<{storeIndex: number, itemData: Object}>} [TileLabels]          Host labels drawn on every tile (the Albums editor's member kind).
 * @property {(itemData: Object) => { select: string, removeTitle: string, remove: string }} [tileCopy] Host words for a tile's select hit (its accessible name) and trash (title, accessible name); the gallery's otherwise.
 */

/** @type {import('react').Context<GalleryPreviewAdminActionsValue|null>} */
export const GalleryPreviewAdminActionsContext = createContext(null);
