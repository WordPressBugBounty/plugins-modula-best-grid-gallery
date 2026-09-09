/**
 * Sidebar layout V2 helpers — resolve copy from generated `SETTINGS_EDITOR_CATEGORIES`
 * (PHP: settings-v2-editor-sidebar-copy.php + editorNavigation, codegen).
 *
 * Do not hardcode user-facing strings here. Edit PHP, then `npm run generate:settings-schemas`.
 */
import { SETTINGS_EDITOR_CATEGORIES } from './editorStructure';
import { humanizeKey } from '../logic/humanizeKey';

/**
 * @param {string} name
 * @return {object|null}
 */
function findCategoryByName(name) {
	const key = typeof name === 'string' ? name.trim() : '';
	if (key === '') {
		return null;
	}
	return (
		SETTINGS_EDITOR_CATEGORIES.find(
			(c) => c && typeof c.name === 'string' && c.name === key
		) || null
	);
}

/**
 * Walk hubSections (including nested submenu items).
 *
 * @param {object[]} sections
 * @param {(section: object) => boolean} pred
 * @return {object|null}
 */
function findHubSection(sections, pred) {
	if (!Array.isArray(sections)) {
		return null;
	}
	for (const section of sections) {
		if (!section || typeof section !== 'object') {
			continue;
		}
		if (pred(section)) {
			return section;
		}
		if (
			section.type === 'submenu' &&
			Array.isArray(section.items) &&
			section.items.length > 0
		) {
			const nested = findHubSection(section.items, pred);
			if (nested) {
				return nested;
			}
		}
	}
	return null;
}

/**
 * @param {object|null} field
 * @returns {string}
 */
export function resolveHubV2FieldLabel(field) {
	if (!field) {
		return '';
	}
	if (typeof field.editorLabel === 'string' && field.editorLabel !== '') {
		return field.editorLabel;
	}
	return humanizeKey(field.groupedKey || '');
}

/**
 * @param {object} section
 * @param {object|null} [field]
 * @param {string} [drillLabel]
 * @returns {string}
 */
export function getSidebarV2HubRowHelp(section, field = null, drillLabel = '') {
	if (
		section &&
		typeof section.hubHelp === 'string' &&
		section.hubHelp.trim() !== ''
	) {
		return section.hubHelp.trim();
	}
	if (section?.type === 'field' && typeof section.groupedPath === 'string') {
		const path = section.groupedPath.trim();
		for (const cat of SETTINGS_EDITOR_CATEGORIES) {
			const hit = findHubSection(cat?.hubSections, (s) => {
				return (
					s.type === 'field' &&
					typeof s.groupedPath === 'string' &&
					s.groupedPath.trim() === path &&
					typeof s.hubHelp === 'string' &&
					s.hubHelp.trim() !== ''
				);
			});
			if (hit) {
				return hit.hubHelp.trim();
			}
		}
		return '';
	}
	if (section?.type === 'drill') {
		const label =
			drillLabel ||
			(typeof section.label === 'string' ? section.label.trim() : '');
		if (label !== '') {
			return getSidebarV2DrillDescription(label);
		}
	}
	return '';
}

/**
 * Footnote under hub rows (ⓘ help) — from field editorDescription when it
 * does not duplicate the hub helper line.
 *
 * @param {object|null} field
 * @param {string} helper
 * @returns {string}
 */
export function getSidebarV2HubRowFootnote(field, helper = '') {
	if (!field || typeof field.editorDescription !== 'string') {
		return '';
	}
	const foot = field.editorDescription.trim();
	if (!foot) {
		return '';
	}
	const norm = (s) =>
		String(s || '')
			.trim()
			.replace(/\.+$/, '');
	if (norm(foot) === norm(helper)) {
		return '';
	}
	if (
		field.schema?.editorGalleryTypeUpsell ||
		field.schema?.editorLightboxLiteUpsell
	) {
		return '';
	}
	return foot;
}

/**
 * @param {string} categoryName
 * @param {string} [fallbackDescription]
 * @returns {string}
 */
export function getSidebarV2CategoryNavHelp(
	categoryName,
	fallbackDescription = ''
) {
	const cat = findCategoryByName(categoryName);
	if (cat && typeof cat.navHelp === 'string' && cat.navHelp.trim() !== '') {
		return cat.navHelp.trim();
	}
	if (
		cat &&
		typeof cat.description === 'string' &&
		cat.description.trim() !== ''
	) {
		return cat.description.trim();
	}
	return fallbackDescription || '';
}

/**
 * @param {string} categoryName
 * @param {string} [fallbackDescription]
 * @returns {string}
 */
export function getSidebarV2CategoryPanelDesc(
	categoryName,
	fallbackDescription = ''
) {
	const cat = findCategoryByName(categoryName);
	if (
		cat &&
		typeof cat.panelDescription === 'string' &&
		cat.panelDescription.trim() !== ''
	) {
		return cat.panelDescription.trim();
	}
	if (
		cat &&
		typeof cat.description === 'string' &&
		cat.description.trim() !== ''
	) {
		return cat.description.trim();
	}
	return fallbackDescription || '';
}

/**
 * Nested drill panel description — prefers `hubHelp` stamped on the drill in structure JS.
 *
 * @param {string} drillTitle Frame title / nav drill label.
 * @param {string} [hubHelpFromFrame] Optional help carried on the sidebar stack frame.
 * @return {string}
 */
export function getSidebarV2DrillDescription(
	drillTitle,
	hubHelpFromFrame = ''
) {
	if (
		typeof hubHelpFromFrame === 'string' &&
		hubHelpFromFrame.trim() !== ''
	) {
		return hubHelpFromFrame.trim();
	}
	const label = typeof drillTitle === 'string' ? drillTitle.trim() : '';
	if (label === '') {
		return '';
	}
	for (const cat of SETTINGS_EDITOR_CATEGORIES) {
		const hit = findHubSection(cat?.hubSections, (s) => {
			return (
				s.type === 'drill' &&
				typeof s.label === 'string' &&
				s.label.trim() === label &&
				typeof s.hubHelp === 'string' &&
				s.hubHelp.trim() !== ''
			);
		});
		if (hit) {
			return hit.hubHelp.trim();
		}
	}
	return '';
}
