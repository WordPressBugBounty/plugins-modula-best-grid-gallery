/**
 * Gallery category rail: visible gallery categories and short labels for the shared rail.
 * Categories Lite locks are marked PRO, Video included (its extension needs PRO).
 */

import { useMemo } from '@wordpress/element';
import { SidebarRailNav, getSidebarRailNavLabel } from 'editor-shell';
import { SETTINGS_EDITOR_CATEGORIES } from '../../constants/editorStructure';
import { isCategoryVisible } from '../../logic/categoryVisibility';
import { resolveCategoryLiteLock } from '../../logic/liteUpsell';
import { useGallerySettingsFormBundle } from '../../form/GallerySettingsFormContext';
import { useModulaSettingsEditorConfig } from '../../hooks/useModulaSettingsEditorConfig';

/**
 * @param {Object}                 props
 * @param {string}                 props.activeCategory
 * @param {(name: string) => void} props.onActiveCategoryChange
 * @param {(name: string) => void} props.onSelect
 */
export default function TakeoverSidebarNavV2({
	activeCategory,
	onActiveCategoryChange,
	onSelect,
}) {
	const { form } = useGallerySettingsFormBundle();

	return (
		<form.Subscribe selector={(s) => s.values}>
			{(values) => (
				<TakeoverSidebarNavV2Inner
					values={values}
					activeCategory={activeCategory}
					onActiveCategoryChange={onActiveCategoryChange}
					onSelect={onSelect}
				/>
			)}
		</form.Subscribe>
	);
}

/**
 * @param {Object}                                  props
 * @param {Record<string, Record<string, unknown>>} props.values
 * @param {string}                                  props.activeCategory
 * @param {(name: string) => void}                  props.onActiveCategoryChange
 * @param {(name: string) => void}                  props.onSelect
 */
function TakeoverSidebarNavV2Inner({
	values,
	activeCategory,
	onActiveCategoryChange,
	onSelect,
}) {
	const editor = useModulaSettingsEditorConfig();
	const lockedNames = useMemo(
		() =>
			new Set(
				SETTINGS_EDITOR_CATEGORIES.filter((category) =>
					resolveCategoryLiteLock(category, values, editor)
				).map((category) => category.name)
			),
		[values, editor]
	);
	// A category locked behind its extension (Video) is not visible, but the
	// rail still lists it, locked.
	const railCategories = useMemo(
		() =>
			SETTINGS_EDITOR_CATEGORIES.filter(
				(category) =>
					lockedNames.has(category.name) ||
					isCategoryVisible(category, values)
			),
		[lockedNames, values]
	);

	return (
		<SidebarRailNav
			categories={railCategories}
			activeCategory={activeCategory}
			onActiveCategoryChange={onActiveCategoryChange}
			onSelect={onSelect}
			getRailLabel={getSidebarRailNavLabel}
			isCategoryLocked={(name) => lockedNames.has(name)}
		/>
	);
}
