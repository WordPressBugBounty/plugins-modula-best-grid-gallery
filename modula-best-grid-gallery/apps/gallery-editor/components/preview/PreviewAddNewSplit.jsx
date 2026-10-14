import { useMemo } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { AddSplit } from 'editor-shell';
import {
	getAddNewRowActionable,
	getAddNewRowDisabledBadge,
	getTakeoverAddNewMenuGroups,
} from '../../utils/takeoverAddNewMenuModel';
import { getModulaSettingsEditorConfig } from '../../config/modulaSettingsEditorConfig';
import { useTakeoverPreviewAddNewMenu } from '../../hooks/useTakeoverPreviewAddNewMenu';

/**
 * Gallery Add split: image/video/import sources for the shared Add split frame.
 *
 * @param {{
 *   onOpenPreviewImport?: (reactFlow: 'folder' | 'zip' | 'content-galleries' | 'instagram' | 'video' | 'video-playlist') => void,
 *   onTakeoverOpenUpload?: () => void,
 *   galleryId?: number,
 *   galleryType?: string,
 *   uploadPosition?: string,
 *   onLibraryAdded?: () => void,
 *   onLibraryError?: (msg: string) => void,
 *   runPersistTask?: (fn: () => void | Promise<void>) => Promise<void>,
 *   mainLabel?: string,
 * }} props
 */
export default function PreviewAddNewSplit({
	onOpenPreviewImport,
	onTakeoverOpenUpload,
	galleryId = 0,
	galleryType = '',
	uploadPosition = 'end',
	onLibraryAdded,
	onLibraryError,
	runPersistTask,
	mainLabel,
}) {
	const editor = getModulaSettingsEditorConfig();
	const { rows, handleRowAction, handlePrimaryAddNew } =
		useTakeoverPreviewAddNewMenu({
			editor,
			galleryId,
			galleryType,
			uploadPosition,
			onOpenPreviewImport,
			onTakeoverOpenUpload,
			onLibraryAdded,
			onLibraryError,
			runPersistTask,
		});

	const menuGroups = useMemo(() => {
		const menuRows = rows.map((row) => ({
			...row,
			actionable: getAddNewRowActionable(row, editor),
			badge: getAddNewRowDisabledBadge(row, editor),
		}));
		if (!editor.takeover) {
			return [{ id: 'default', label: '', rows: menuRows }];
		}
		return getTakeoverAddNewMenuGroups()
			.map((group) => ({
				...group,
				rows: menuRows.filter((row) => row.group === group.id),
			}))
			.filter((group) => group.rows.length > 0);
	}, [editor, rows]);

	return (
		<AddSplit
			mainLabel={mainLabel || __('Add New', 'modula-best-grid-gallery')}
			onPrimary={handlePrimaryAddNew}
			caretLabel={__('Open add media menu', 'modula-best-grid-gallery')}
			menuGroups={menuGroups}
			onSelectRow={handleRowAction}
		/>
	);
}
