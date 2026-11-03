/**
 * Pagination lives under the Layout hub (a nested section), not a top-level
 * category. The canvas shows the pagination preview while that section is open.
 */
import { SETTINGS_EDITOR_CATEGORIES } from '../constants/editorStructure';
import { shouldRenderHubSection } from '../logic/hubSectionVisibility';
import { buildSectionKey, isSectionOpen } from '../logic/settingsPanelSections';

const layoutHub = SETTINGS_EDITOR_CATEGORIES.find(
	(category) => category.name === 'layout'
)?.hubSections.find((submenu) => submenu.id === 'hub');
const paginationSection = layoutHub?.items.find(
	(item) => item.id === 'pagination'
);
const PAGINATION_SECTION_KEY = paginationSection
	? buildSectionKey(buildSectionKey('layout', layoutHub), paginationSection)
	: '';

/**
 * @param {string}                                  activeCategory Current takeover category id.
 * @param {Record<string, boolean>}                 openSections   Settings panel open state, by section key.
 * @param {Record<string, Record<string, unknown>>} values         Grouped form values.
 * @return {boolean} True while the Layout tab shows the open pagination section.
 */
export function isPaginationSettingsPreviewActive(
	activeCategory,
	openSections,
	values
) {
	if (activeCategory !== 'layout' || !paginationSection) {
		return false;
	}
	return (
		isSectionOpen(
			openSections,
			PAGINATION_SECTION_KEY,
			paginationSection
		) && shouldRenderHubSection(paginationSection, values)
	);
}
