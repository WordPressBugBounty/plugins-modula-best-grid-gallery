/**
 * Shapes the editors pass to the takeover history controls. Types only.
 */

/**
 * Editor history as exposed by the owning editor's undo/redo stack.
 *
 * @typedef {Object} EditorHistory
 * @property {() => void}                 undo           Step back one entry.
 * @property {() => void}                 redo           Step forward one entry.
 * @property {boolean}                    canUndo        Whether a past entry exists.
 * @property {boolean}                    canRedo        Whether a future entry exists.
 * @property {string}                     undoStepLabel  Label of the entry Undo reverts.
 * @property {string}                     redoStepLabel  Label of the entry Redo reapplies.
 * @property {Array<Object>}              historyEntries Timeline rows (index, type, label, position, committedAt, change).
 * @property {(index: number) => unknown} jumpTo         Restore the entry at an index (-1: the original state) and drop later entries.
 * @property {number}                     undoableCount  Number of past entries.
 * @property {() => void}                 clearHistory   Empty the stack at the current entry.
 */

/**
 * History scope wording, already translated by the owning editor.
 *
 * @typedef {Object} HistoryLabels
 * @property {string} heading             Popover heading (e.g. Settings history).
 * @property {string} clearConfirmMessage What Clear history removes.
 */

export {};
