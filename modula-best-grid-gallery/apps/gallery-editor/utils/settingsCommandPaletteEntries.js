/**
 * @typedef {Object} PaletteField
 * @property {string}                              groupedPath
 * @property {string}                              groupedKey
 * @property {string}                              [editorLabel]
 * @property {string}                              [flatKey]
 * @property {object}                              [editorUi]
 * @property {object|null}                         [schema]
 * @property {string}                              [editorDescription]
 * @property {{ kind?: string }}                   [control]
 */

/**
 * @typedef {Object} PaletteIndexCategoryEntry
 * @property {'category'} kind
 * @property {string}     id
 * @property {string}     title
 * @property {string}     categoryName
 * @property {string}     searchBlob
 */

/**
 * @typedef {Object} PaletteIndexGroupEntry
 * @property {'group'} kind
 * @property {string}    id
 * @property {string}    title
 * @property {string}    categoryName
 * @property {string}    groupKey
 * @property {string}    searchBlob
 */

/**
 * @typedef {Object} PaletteIndexFieldEntry
 * @property {'field'}   kind
 * @property {string}    id
 * @property {string}    title
 * @property {string}    categoryName
 * @property {string}    groupKey
 * @property {string}    groupedPath
 * @property {string}    searchBlob
 * @property {PaletteField} _field Internal — stripped after filtering.
 */

/**
 * @typedef {PaletteIndexCategoryEntry|PaletteIndexGroupEntry|PaletteIndexFieldEntry} PaletteIndexEntry
 */

export {};
