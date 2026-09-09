/**
 * Add New menu entitlements from PHP bootstrap config.
 */
import { getModulaSettingsEditorConfig } from '../config/modulaSettingsEditorConfig';

/**
 * @param {Record<string, unknown>} [editorConfig]
 * @returns {{ folderImport: boolean, zipImport: boolean }}
 */
export function getAddNewEntitlements(editorConfig) {
	const editor = editorConfig || getModulaSettingsEditorConfig();
	const entitlements =
		editor.addNewEntitlements &&
		typeof editor.addNewEntitlements === 'object'
			? editor.addNewEntitlements
			: {};
	return {
		folderImport: Boolean(entitlements.folderImport),
		zipImport: Boolean(entitlements.zipImport),
	};
}

/**
 * @param {{ id?: string, reactFlow?: string, requiresProOnly?: boolean }} row
 * @param {Record<string, unknown>} editor
 * @returns {boolean}
 */
export function isAddNewProFeatureEntitled(row, editor) {
	const entitlements = getAddNewEntitlements(editor);
	if (row.id === 'folder' || row.reactFlow === 'folder') {
		return entitlements.folderImport;
	}
	if (row.id === 'zip' || row.reactFlow === 'zip') {
		return entitlements.zipImport;
	}
	if (row.requiresProOnly) {
		return Boolean(editor.isPro);
	}
	return true;
}
