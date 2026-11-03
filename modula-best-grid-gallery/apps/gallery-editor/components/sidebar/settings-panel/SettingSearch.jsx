/**
 * The shell's Setting search fed by the gallery's settings: the index is
 * built once per structure, and the form state picks the settings shown.
 */
import { useCallback, useMemo } from '@wordpress/element';
import { useStore } from '@tanstack/react-form';
import { SettingSearch as ShellSettingSearch } from 'editor-shell';
import { SETTINGS_EDITOR_CATEGORIES } from '../../../constants/editorStructure';
import { useGallerySettingsFormBundle } from '../../../form/GallerySettingsFormContext';
import { useLiveGalleryPhotoCount } from '../../../hooks/useLiveGalleryPhotoCount';
import { useModulaSettingsEditorConfig } from '../../../hooks/useModulaSettingsEditorConfig';
import {
	buildSettingSearchIndex,
	listShownSettings,
} from '../../../logic/settingSearch';

/**
 * @param {Object}                                                                       props
 * @param {string}                                                                       props.query
 * @param {(next: string) => void}                                                       props.onQueryChange
 * @param {(result: import('../../../logic/settingSearch').SettingSearchResult) => void} props.onChoose
 * @param {import('react').ReactNode}                                                    props.children      The category's settings, shown without a query.
 */
export default function SettingSearch({
	query,
	onQueryChange,
	onChoose,
	children,
}) {
	const { form } = useGallerySettingsFormBundle();
	const editor = useModulaSettingsEditorConfig();
	const values = useStore(form.store, (state) => state.values);
	// Rows gated on the photo count leave or join the results as photos change.
	const photoCount = useLiveGalleryPhotoCount();

	const groupLabels = editor.formUi?.groupLabels;
	const index = useMemo(
		() => buildSettingSearchIndex(SETTINGS_EDITOR_CATEGORIES, groupLabels),
		[groupLabels]
	);
	const listShown = useCallback(
		() => listShownSettings(index, values, editor),
		// photoCount is read through the form rules, not passed in.
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[index, values, editor, photoCount]
	);

	return (
		<ShellSettingSearch
			query={query}
			onQueryChange={onQueryChange}
			onChoose={onChoose}
			listShown={listShown}
		>
			{children}
		</ShellSettingSearch>
	);
}
