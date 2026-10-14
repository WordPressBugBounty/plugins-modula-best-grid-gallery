/**
 * Gallery category rail: visible gallery categories, icons and short labels for the shared rail.
 */

import { useMemo } from '@wordpress/element';
import { SidebarRailNav, getSidebarRailNavLabel } from 'editor-shell';
import { SETTINGS_EDITOR_CATEGORIES } from '../../constants/editorStructure';
import { TAKEOVER_CATEGORY_ICONS } from '../../constants/takeoverCategoryIcons';
import { getVisibleCategories } from '../../logic/categoryVisibility';
import { useGallerySettingsFormBundle } from '../../form/GallerySettingsFormContext';

/**
 * @param {Object}                 props
 * @param {string}                 props.activeCategory
 * @param {(name: string) => void} props.onActiveCategoryChange
 * @param {(name: string) => void} props.onSelect
 * @param {string}                 [props.docsUrl]
 */
export default function TakeoverSidebarNavV2({
	activeCategory,
	onActiveCategoryChange,
	onSelect,
	docsUrl = '',
}) {
	const { form } = useGallerySettingsFormBundle();

	return (
		<form.Subscribe
			selector={(s) => ({
				general: {
					type: s.values?.general?.type,
				},
			})}
		>
			{(values) => (
				<TakeoverSidebarNavV2Inner
					values={values}
					activeCategory={activeCategory}
					onActiveCategoryChange={onActiveCategoryChange}
					onSelect={onSelect}
					docsUrl={docsUrl}
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
 * @param {string}                                  props.docsUrl
 */
function TakeoverSidebarNavV2Inner({
	values,
	activeCategory,
	onActiveCategoryChange,
	onSelect,
	docsUrl,
}) {
	const visible = useMemo(
		() => getVisibleCategories(SETTINGS_EDITOR_CATEGORIES, values),
		[values]
	);

	return (
		<SidebarRailNav
			categories={visible}
			activeCategory={activeCategory}
			onActiveCategoryChange={onActiveCategoryChange}
			onSelect={onSelect}
			icons={TAKEOVER_CATEGORY_ICONS}
			getRailLabel={getSidebarRailNavLabel}
			docsUrl={docsUrl}
		/>
	);
}
